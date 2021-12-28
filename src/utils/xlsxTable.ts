import fs from "fs";
import { Types } from "mongoose";
import { Modules, ModuleType } from "./models/Module";
import { ApiError } from "./apiError";
import { inputSetModule, setModule, toggleConChild, inputToggleConChilds } from "../api_funcs/module";
import { IAccount } from "../api_funcs/interfaces";
import { inputSetQuestion, inputToggleConQuestion, setQuestion, toggleConQuestion } from "../api_funcs/question";
import { IAnswer } from "./models/Answer";

const path = require("path");
const xlsx = require("xlsx");
const unzip = require("unzipper");
const { XMLParser } = require("fast-xml-parser");

/**
 * Types of questions
 */
const QUESTION_TYPES = {
  OO: "oneCorrect",
  // OOMQ: "one_option_many_question",
  MO: "manyCorrect",
  // COS: "correct_option_sequence",
};

/**
 * Import test
 * @param account
 * @param table_path
 * @param module
 */
export const importTest = (account: IAccount, table_path: string, module: string | boolean) => {
  // Определяем имя таблицы
  let table_name_regex = /^(.*)\/(\w+)\.xlsx$/.exec(table_path);
  let table_name: string;
  let table_source_path: string;
  if (table_name_regex?.length === 3) {
    table_name = table_name_regex[2];
    table_source_path = path.join(
      global.GLOBAL_DIR,
      "tmp",
      `${table_name}_source`
    );
  } else {
    throw new ApiError(500, "Table haven't name");
  }

  if(!fs.existsSync(table_path))
    throw new ApiError(500, "Table path incorrect");

  // Разархивация таблицы как ZIP-архива для извлечения медиа
  fs.createReadStream(table_path)
    .pipe(unzip.Extract({ path: table_source_path }))
    .on("close", async () => {
      // Читаем Excel файл и берём информацию о первом листе в виде JSON
      const workbook = xlsx.readFile(table_path);
      const sheet_name_list = workbook.SheetNames;
      const sheet_data = xlsx.utils.sheet_to_json(
        workbook.Sheets[sheet_name_list[0]]
      );

      // Создаём парсер XML файла
      const xml_parser = new XMLParser({ ignoreAttributes: false });
      // Парсим XML файлы, отвечающие за ссылки на изображения
      let xml_drawing_structure = xml_parser.parse(
        fs.readFileSync(
          path.join(table_source_path, "xl", "drawings", "drawing1.xml")
        )
      );
      let xml_drawing_rels_structure = xml_parser.parse(
        fs.readFileSync(
          path.join(
            table_source_path,
            "xl",
            "drawings",
            "_rels",
            "drawing1.xml.rels"
          )
        )
      );
      // Подготавливаем массив для хранения строк нормализированной таблицы
      const normalize_table = [];

      // Процесс нормализации таблицы
      for (let i = 2; i < sheet_data.length; i++) {
        const sheet_row_data = sheet_data[i];
        const final_row: any = {};

        // Функция добавления столбца в строку
        const adding_row = (
          index: number,
          options: any
        ) => {
          const row: any = final_row[index.toString()] || {};

          for (let key in options) {
            row[key] = options[key];
          }
          final_row[index.toString()] = row;
        };

        // Получаем ассоциации id с картинками
        if(xml_drawing_rels_structure["Relationships"]["Relationship"]) {
          let rels_images: any = {};
          const make_rel_image = (rel: any) => {
            // Имя картинки на основе пути к нему
            const rel_image_name_regex = /^(.*)\/(.*)$/.exec(rel["@_Target"]);
            let rel_image_name;
            if (rel_image_name_regex?.length === 3) {
              rel_image_name = rel_image_name_regex[2];
            } else {
              throw new ApiError(500, "Rels image not found");
            }

            // Новая ассоциация
            const new_rel: any = {
              name: rel_image_name,
              path: path.join(table_source_path, "xl", "media", rel_image_name),
            };

            rels_images[rel["@_Id"]] = new_rel;
          }

          if(xml_drawing_rels_structure["Relationships"]["Relationship"].length) {
            for (let rel of xml_drawing_rels_structure["Relationships"]["Relationship"]) {
              make_rel_image(rel);
            }
          } else {
            make_rel_image(xml_drawing_rels_structure["Relationships"]["Relationship"]);
          }

          // Получаем все картинки для текущей строки
          for (let obj of xml_drawing_structure["xdr:wsDr"][
            "xdr:twoCellAnchor"
          ]) {
            if (obj["xdr:pic"]) {
              let from = obj["xdr:from"];
              if (from["xdr:row"] - 4 === i) {
                let image_id =
                  obj["xdr:pic"]["xdr:blipFill"]["a:blip"]["@_r:embed"];

                adding_row(from["xdr:col"], {
                  image: rels_images[image_id],
                });
              }
            }
          }
        }

        // Перебираем все столбцы строки
        for (let key in sheet_row_data) {
          let regex = /(.*)_(\d+)/;

          let index = 0;
          if (regex.test(key)) {
            let index_regex = regex.exec(key);

            if (index_regex?.length === 3) {
              index = parseInt(index_regex[2]);
            }
          }

          adding_row(index, { text: sheet_row_data[key] });
        }

        normalize_table.push(final_row);
      }

      // Создание необходимых директорий
      const path_save_tests = path.join(global.GLOBAL_DIR, "tests");
      if (!fs.existsSync(path_save_tests)) fs.mkdirSync(path_save_tests);
      const test_save_root_path = path.join(path_save_tests, table_name);
      if (!fs.existsSync(test_save_root_path))
        fs.mkdirSync(test_save_root_path);
      const test_save_media_path = path.join(test_save_root_path, "media");
      if (!fs.existsSync(test_save_media_path))
        fs.mkdirSync(test_save_media_path);

      // Структура теста
      const test_structure: any = {
        module: sheet_data[0]["__EMPTY_2"],
        list: [],
      };

      // Создаём модуль, исходя из того, что в теме(или находим существующий)
      let needed_module;
      if (typeof module !== "boolean" && !(needed_module = await Modules.findOne({ _id: new Types.ObjectId(module) }))) {
        const needed_module_data: inputSetModule = {
          name: test_structure.module,
          desc: "Автоматически созданный модуль по данным из таблицы"
        };
        // Получаем созданный модуль
        needed_module = await setModule(account, needed_module_data);
      }

      // Массив созданных тем
      const created_themes = [];

      // Парсим нормализированную таблицу в новый вид
      for (let rId = 0; rId < normalize_table.length; rId++) {
        const current_row = normalize_table[rId];

        // Записываем необходимые данные о вопросе
        const type = current_row["2"].text;
        const theme = current_row["3"].text;
        const lvl = (current_row["4"].text) ? 1 : 2;
        const is_milestone = current_row["8"].text === "1" ? true : false;
        const desc = current_row["10"].text;

        // Определяемся с темой
        let needed_theme;
        if (!(needed_theme = await Modules.findOne({ name: theme }))) {
          const needed_theme_data: inputSetModule = {
            name: theme,
            desc: "Автоматически созданный модуль по данным из таблицы"
          };
          // Получаем созданную тему
          needed_theme = await setModule(account, needed_theme_data);
        }

        // Если тема уже имеется - добавляем, если нет, похуй
        if (created_themes.indexOf(needed_theme) === -1)
          created_themes.push(needed_theme);

        // Неправильные ответы
        const answers: Array<IAnswer> = [];
        // Правильный ответ (OO)
        let correctAnswer: any;
        // Правильные ответы (MO)
        const correctAnswers: Array<IAnswer> = [];
        // Вопросы
        const questions: Array<any> = [];

        // Данные о тесте
        let test_data = {
          desc,
          lvl,
          type
        };

        // Индекс начала просчётов
        const column_option_start_index = 11;

        // Далее в зависимости от типа
        switch (type) {
          // Один вариант вопроса, один правильный ответ, несколько вариантов
          case QUESTION_TYPES.OO:
            for (
              let elId = column_option_start_index + 1;
              elId < Object.keys(current_row).length;
              elId += 2
            ) {
              const el = current_row[elId.toString()];
              console.log(el);
              
              let isCorrect = false;

              // Если это первый ответ - значит он верный
              if (column_option_start_index === elId) isCorrect = true;

              // Создаём объект ответа
              const data: IAnswer = {
                desc: el.text || "Image",
                img: undefined,
              };

              // Экспортируем изображения (если имеются)
              if (el.image && typeof el.image !== "string") {
                const image_path = path.join(
                  test_save_media_path,
                  el.image.name
                );
                fs.renameSync(el.image.path, image_path);
                data.img = image_path;
              }

              // Заносим ответ на вопрос
              if (!isCorrect) {
                answers.push(data);
              } else {
                correctAnswer = data;
              }
            }
            break;

          // Один вопрос, несколько возможных вариантов ответа
          case QUESTION_TYPES.MO:
            let el_number = 1;
            for (
              let elId = column_option_start_index + 1;
              elId < Object.keys(current_row).length;
              elId += 2
            ) {
              const el = current_row[elId.toString()];
              const correct_number =
                current_row[column_option_start_index.toString()].text;
              let isCorrect = false;

              // Если это первый ответ - значит он верный
              if (el_number === correct_number) isCorrect = true;
              
              // Создаём объект ответа
              const data = {
                desc: el.text,
                img: undefined,
              };

              // Экспортируем изображения (если имеются)
              if (el.image && typeof el.image !== "string") {
                const image_path = path.join(
                  test_save_media_path,
                  el.image.name
                );
                fs.renameSync(el.image.path, image_path);
                data.img = image_path;
              }

              // Заносим ответ на вопрос
              if (!isCorrect) {
                answers.push(data);
              } else {
                correctAnswers.push(data);
              }

              el_number++;
            }

            break;

          // Несколько вариантов вопроса, несколько вариантов ответа
          // case QUESTION_TYPES.OOMQ:
          // case QUESTION_TYPES.COS:
          //   // Добавление ответов
          //   for (
          //     let elId = column_option_start_index + 1;
          //     elId < Object.keys(current_row).length;
          //     elId += 2
          //   ) {
          //     const el = current_row[elId.toString()];

          //     // Создаём объект ответа
          //     const data = {
          //       text: el.text,
          //       image: undefined,
          //     };

          //     // Экспортируем изображения (если имеются)
          //     if (el.image && typeof el.image !== "string") {
          //       const image_path = path.join(
          //         test_save_media_path,
          //         el.image.name
          //       );
          //       fs.renameSync(el.image.path, image_path);
          //       data.image = image_path;
          //     }

          //     // Заносим ответ на вопрос
          //     answers.push(data);
          //   }

          //   // Добавление вопросов
          //   let question_index = 0;
          //   for (
          //     let elId = column_option_start_index;
          //     elId < Object.keys(current_row).length;
          //     elId += 2
          //   ) {
          //     const el = current_row[elId.toString()];

          //     // Создаём объект вопроса
          //     const data = {
          //       desc: el.text,
          //       image: undefined,
          //     };

          //     // Экспортируем изображения (если имеются)
          //     if (el.image && typeof el.image !== "string") {
          //       const image_path = path.join(
          //         test_save_media_path,
          //         el.image.name
          //       );
          //       fs.renameSync(el.image.path, image_path);
          //       data.image = image_path;
          //     }

          //     // Заносим вопрос
          //     questions.push(data);

          //     question_index++;
          //   }

          //   test_data = {
          //     type,
          //     theme,
          //     lvl,
          //     is_milestone,
          //     text,
          //     answers,
          //     questions,
          //   };
          //   break;

          // Верная последовательность единиц
          // case QUESTION_TYPES.COS:
          //     // Добавление ответов
          //     for(let elId = column_option_start_index + 1; elId < Object.keys(current_row).length; elId += 2) {
          //         const el = current_row[elId.toString()];

          //         // Создаём объект ответа
          //         const data = {
          //             text: el.text
          //         };

          //         // Экспортируем изображения (если имеются)
          //         if(el.image) {
          //             const image_path = path.join(test_save_media_path, el.image.name);
          //             fs.renameSync(el.image.path, image_path);
          //             data["image"] = image_path;
          //         }

          //         // Заносим ответ на вопрос
          //         answers.push(data);
          //     }

          //     // Добавление вопросов
          //     let question_index = 0;
          //     for(let elId = column_option_start_index; elId < Object.keys(current_row).length; elId += 2) {
          //         const el = current_row[elId.toString()];

          //         // Создаём объект вопроса
          //         const data = {
          //             text: el.text,
          //             correctAnswer: answers[question_index]
          //         };

          //         // Экспортируем изображения (если имеются)
          //         if(el.image) {
          //             const image_path = path.join(test_save_media_path, el.image.name);
          //             fs.renameSync(el.image.path, image_path);
          //             data["image"] = image_path;
          //         }

          //         // Заносим вопрос
          //         questions.push(data);

          //         question_index++;
          //     }

          //     test_data = {
          //         type,
          //         theme,
          //         lvl,
          //         is_milestone,
          //         text,
          //         answers,
          //         questions
          //     };
          //     break;

            default:
              continue;
        }

        // Добавить новый вопрос в лист теста
        test_structure.list.push(test_data);

        // Добавляем вопрос в БД
        const setQuestionData: inputSetQuestion = {
          desc: desc,
          lvl: lvl,
          type: type,
          answers: answers,
        };

        // Добавляем опциональные строки
        if (type === QUESTION_TYPES.OO) {
          setQuestionData.correctAnswer = correctAnswer;
        } else if (type === QUESTION_TYPES.MO) {
          setQuestionData.correctAnswers = correctAnswers;
        }
        
        // Создаём новый вопрос в БД и подключаем его к созданной теме
        let created_question;
        if ((created_question = await setQuestion(account, setQuestionData))) {
          if (!created_question.newQuestion)
            throw new ApiError(500, "Shut of fuck");

          let moduleId;
          if ("newModule" in needed_theme) {
            moduleId = needed_theme.newModule._id;
          } else {
            moduleId = needed_theme._id;
          }

          // Описание отношений вопроса
          const create_question_rel: inputToggleConQuestion = {
            questionId: created_question.newQuestion._id,
            moduleId: moduleId,
            milestone: is_milestone
          };

          await toggleConQuestion(account, create_question_rel);
        }
      }

      // Связанные темы
      if (needed_module) {
        for (let theme of created_themes) {
          let parentId;
          if ("newModule" in needed_module) {
            parentId = needed_module.newModule._id;
          } else {
            parentId = needed_module._id;
          }

          let childId;
          if ("newModule" in theme) {
            childId = theme.newModule._id;
          } else {
            childId = theme._id;
          }

          const theme_rel_options: inputToggleConChilds = {
            parentId,
            childId
          };

          await toggleConChild(account, theme_rel_options);
        }
      }
      // Удаляем лишний мусор после работы
      fs.rmSync(table_source_path, { recursive: true });
      fs.rmSync(table_path, { recursive: true });
    });
}

module.exports = {
  importTest,
};