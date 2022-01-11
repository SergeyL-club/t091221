import fs, { ReadStream } from "fs";
import { Types } from "mongoose";
import { Modules, ModuleType } from "./models/Module";
import { ApiError } from "./apiError";
import {
  inputSetModule,
  setModule,
  toggleConChild,
  inputToggleConChilds,
} from "../api_funcs/module";
import { IAccount } from "../api_funcs/interfaces";
import {
  inputSetQuestion,
  inputToggleConQuestion,
  setQuestion,
  toggleConQuestion,
} from "../api_funcs/question";
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
export const importTest = (
  account: IAccount,
  table_path: string,
  module: string | boolean
) => {
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

  if (!fs.existsSync(table_path))
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
      for (let i = 2; i < sheet_data.length + 10; i++) {
        const sheet_row_data = sheet_data[i];
        const final_row: any = {};

        // Функция добавления столбца в строку
        const adding_row = (index: number, options: any) => {
          const row: any = final_row[index.toString()] || {};

          for (let key in options) {
            row[key] = options[key];
          }
          final_row[index.toString()] = row;
        };

        // Получаем ассоциации id с картинками
        if (xml_drawing_rels_structure["Relationships"]["Relationship"]) {
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
          };

          if (
            xml_drawing_rels_structure["Relationships"]["Relationship"].length
          ) {
            for (let rel of xml_drawing_rels_structure["Relationships"][
              "Relationship"
            ]) {
              make_rel_image(rel);
            }
          } else {
            make_rel_image(
              xml_drawing_rels_structure["Relationships"]["Relationship"]
            );
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

      // Создаём модуль, исходя из того, что в теме(или находим существующий)
      let needed_module;
      if (
        typeof module !== "boolean" &&
        !(needed_module = await Modules.findOne({
          _id: new Types.ObjectId(module),
        }))
      ) {
        const needed_module_data: inputSetModule = {
          name: sheet_data[0]["__EMPTY_2"],
          desc: "Автоматически созданный модуль по данным из таблицы",
        };
        // Получаем созданный модуль
        needed_module = await setModule(account, needed_module_data);
      }

      // Массив созданных тем
      const created_themes = [];

      // Функция переброса картинки в папку для конкретного теста
      const process_image = (el: any) => {
        if (el.image && typeof el.image !== "string") {
          const image_path = path.join(test_save_media_path, el.image.name);
          fs.renameSync(el.image.path, image_path);
          return image_path;
        }
        return undefined;
      };

      // Парсим нормализированную таблицу в новый вид
      for (let rId = 0; rId < normalize_table.length; rId++) {
        const current_row = normalize_table[rId];

        // Выключаем член, если я устал
        if (Object.keys(current_row).length === 0) continue;

        // Записываем необходимые данные о вопросе
        const type = current_row["2"].text || "";
        const theme = current_row["3"].text || "";
        const lvl = current_row["4"].text ? 1 : 2;
        const is_milestone = current_row["8"].text === "1" ? true : false;
        let desc = current_row["10"].text || "";

        // Определяемся с темой
        let needed_theme;
        if (!(needed_theme = await Modules.findOne({ name: theme }))) {
          const needed_theme_data: inputSetModule = {
            name: theme,
            desc: "Автоматически созданный модуль по данным из таблицы",
          };
          // Получаем созданную тему
          needed_theme = await setModule(account, needed_theme_data);
        }

        // Если тема уже имеется - добавляем, если нет, похуй
        if (created_themes.indexOf(needed_theme) === -1)
          created_themes.push(needed_theme);

        // Вопросы
        const questions = [];

        // Индекс начала просчётов
        const column_option_start_index = 11;

        // Данные для вопроса
        let answers: any = [];
        let correctAnswers: any = [];
        let question_index = 0;

        // Проверяем тип
        switch (type) {
          // Несколько вариантов вопроса - один правильный ответ
          case QUESTION_TYPES.OO:
            // Ответы
            for (
              let elId = column_option_start_index + 1;
              elId < Object.keys(current_row).length + 20;
              elId += 2
            ) {
              const el = current_row[elId.toString()];

              if (!el) continue;

              // Создаём объект ответа
              const answer: IAnswer = {
                desc: el.text || "Image answer",
                img: process_image(el),
              };

              // Заносим ответ на вопрос
              answers.push(answer);
            }

            // Вопросы
            for (
              let elId = column_option_start_index;
              elId < Object.keys(current_row).length;
              elId += 2
            ) {
              // Текущий вопрос
              const el = current_row[elId.toString()];
              // Правильный ответ
              const correctAnswer = answers[question_index];
              // Удалить правильный ответ из копии ответов
              const answers_moment: any = Array.from(answers);
              delete answers_moment[question_index];
              console.log(answers);

              if (answers.length <= 4) continue;

              // Добавить вопрос
              questions.push({
                type,
                lvl,
                milestone: is_milestone,
                desc: [desc, el ? el.text : ""].join(" "),
                answers: answers_moment,
                correctAnswer,
              });

              question_index++;
            }
            break;

          // Один вопрос - множество правильных ответов
          case QUESTION_TYPES.MO:
            // Ответы
            for (
              let elId = column_option_start_index + 1;
              elId < Object.keys(current_row).length + 20;
              elId += 2
            ) {
              const el = current_row[elId.toString()];
              const right_marker = current_row[(elId - 1).toString()];

              if (typeof el === "undefined") continue;

              // Создаём объект ответа
              const answer: IAnswer = {
                desc: el.text || "Image answer",
                img: process_image(el),
              };

              // Записываем в нужный массив
              if (
                typeof right_marker !== "undefined" &&
                right_marker.text.toString() === "1"
              ) {
                correctAnswers.push(answer);
              } else {
                answers.push(answer);
              }
            }

            // Добавить вопрос
            questions.push({
              type,
              lvl,
              milestone: is_milestone,
              desc: desc,
              answers,
              correctAnswers,
            });
            break;

          default:
            continue;
        }

        // Добавляем все вопросы в БД
        for (let question of questions) {
          // Добавляем вопрос в БД
          const setQuestionData: inputSetQuestion = question;

          // Создаём новый вопрос в БД и подключаем его к созданной теме
          let created_question;
          if (
            (created_question = await setQuestion(account, setQuestionData))
          ) {
            if (!created_question.newQuestion)
              throw new ApiError(500, "Error insertion database");

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
              milestone: is_milestone,
            };

            await toggleConQuestion(account, create_question_rel);
          }
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
            childId,
          };

          await toggleConChild(account, theme_rel_options);
        }
      }
      // Удаляем лишний мусор после работы
      fs.rmSync(table_source_path, { recursive: true });
      fs.rmSync(table_path, { recursive: true });
    });
};

/**
 * Import module map
 * @param account
 * @param table_path
 * @param module
 */
export const importModuleMap = async (
  account: IAccount,
  table_path: string,
  module: string | boolean
) => {
  // Определяем имя таблицы
  let table_name_regex = /^(.*)[(\/)(\\)](.*)\.(.*)$/.exec(table_path);
  let table_name: string;
  let table_source_path: string;
  if (table_name_regex?.length) {
    table_name = table_name_regex[2];
    table_source_path = path.join(
      global.GLOBAL_DIR,
      "tmp",
      `${table_name}_source`
    );
  } else {
    throw new ApiError(500, "Table haven't name");
  }

  if (!fs.existsSync(table_path))
    throw new ApiError(500, "Table path incorrect");

  // Читаем Excel файл и берём информацию о первом листе в виде JSON
  const workbook = xlsx.readFile(table_path);
  const sheet_name_list = workbook.SheetNames;
  const sheet_data = xlsx.utils.sheet_to_json(
    workbook.Sheets[sheet_name_list[0]]
  );

  // Созданные модули
  const created_modules = <any>{};

  for (let i = 1; i < sheet_data.length; i++) {
    const sheet_row_data = sheet_data[i];

    const lvl = sheet_row_data["__EMPTY"] > 1 ? -1 : 0;
    const name = sheet_row_data["__EMPTY_2"];
    const desc = sheet_row_data["__EMPTY_4"] || "Automatic";
    const key = sheet_row_data["Узлы текущего уровня"];

    // Создаём или получаем текущий модуль
    let module;
    if (!(module = await Modules.findOne({ name: name })))
      module = await setModule(account, <inputSetModule>{ name, desc, lvl });

    // Заносим в наш массив
    created_modules[key] =
      "newModule" in module ? module.newModule._id : module._id;

    // Прикрепляем к родителю
    if (lvl === -1) {
      const parentId = created_modules[sheet_row_data["Родитель"]];
      await toggleConChild(account, <inputToggleConChilds>{
        parentId,
        childId: created_modules[key],
      });
    }
  }
};

module.exports = {
  importTest,
  importModuleMap,
};
