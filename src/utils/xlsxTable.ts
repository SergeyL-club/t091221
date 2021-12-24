import { text } from "body-parser";
import { ApiError } from "./apiError";

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const unzip = require("unzipper");
const {XMLParser} = require('fast-xml-parser');

/**
 * Types of questions
 */
const QUESTION_TYPES = {
    OO: "one_option",
    OOMQ: "one_option_many_question",
    MO: "many_option",
    COS: "correct_option_sequence"
};

/**
 * Normalize rels images
 * @interface
 * @param name: string
 * @param path: string
 */
 interface table_rels_image {
    name: string | undefined,
    path: string | undefined
}

/**
 * Normalize table options
 * @interface
 * @param[key: string]: object
 */
 interface table_row_interface_options {
    [key: string]: any | undefined
}

/**
 * Normalize table row
 * @interface
 * @param[key: string]: object
 */
interface table_row_interface {
    [key: string]: table_row_interface_options
}

/**
 * Normalize rels images
 * @interface
 * @param [key: string]: table_rels_image
 */
 interface table_rels_images {
    [key: string]: table_rels_image
 }

/**
 * Normalize table
 * @param table_path
 */
function normalizeTable (table_path: string) {
    // Определяем имя таблицы
    let table_name_regex = /^(.*)\/(\w+)\.xlsx$/.exec(table_path);
    let table_name: string;
    let table_source_path: string;
    if(table_name_regex?.length === 3){
        table_name = table_name_regex[2];
        table_source_path = path.join(global.GLOBAL_DIR, "tmp", `${table_name}_source}`);
    } else {
        throw new ApiError(500, "Table haven't name");
    }

    // Разархивация таблицы как ZIP-архива для извлечения медиа
    fs.createReadStream(table_path).pipe(unzip.Extract({path: table_source_path})).on('close', () => {
        // Читаем Excel файл и берём информацию о первом листе в виде JSON
        const workbook = xlsx.readFile(table_path);
        const sheet_name_list = workbook.SheetNames;
        const sheet_data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

        // Создаём парсер XML файла
        const xml_parser = new XMLParser({ignoreAttributes : false});
        // Парсим XML файлы, отвечающие за ссылки на изображения
        let xml_drawing_structure = xml_parser.parse(fs.readFileSync(path.join(table_source_path, "xl", "drawings", "drawing1.xml")));
        let xml_drawing_rels_structure = xml_parser.parse(fs.readFileSync(path.join(table_source_path, "xl", "drawings", "_rels", "drawing1.xml.rels")));
        // Подготавливаем массив для хранения строк нормализированной таблицы
        const normalize_table = [];

        // Процесс нормализации таблицы
        for(let i = 2; i < sheet_data.length; i++) {
            const sheet_row_data = sheet_data[i];
            const final_row: table_row_interface = {};

            // Функция добавления столбца в строку
            const adding_row = (index: number, options: table_row_interface_options) => {
                const row: table_row_interface_options = final_row[index.toString()];
                for(let key in options) {
                    row[key] = options[key];
                }
                final_row[index.toString()] = row;
            }

            // Получаем ассоциации id с картинками
            let rels_images: table_rels_images = {};
            for(let rel of xml_drawing_rels_structure["Relationships"]["Relationship"]) {
                // Имя картинки на основе пути к нему
                const rel_image_name_regex = /^(.*)\/(.*)$/.exec(rel["@_Target"]);
                let rel_image_name;
                if(rel_image_name_regex?.length === 3) {
                    rel_image_name = rel_image_name_regex[2];
                } else {
                    throw new ApiError(500, "Rels image not found");
                }

                // Новая ассоциация
                const new_rel: table_rels_image = {
                    name: rel_image_name,
                    path: path.join(table_source_path, "xl", "media", rel_image_name),
                };

                rels_images[rel["@_Id"]] = new_rel;
            }

            // Получаем все картинки для текущей строки
            for(let obj of xml_drawing_structure["xdr:wsDr"]["xdr:twoCellAnchor"]) {
                if(obj["xdr:pic"]) {
                    let from = obj["xdr:from"];
                    if((from["xdr:row"] - 4) === i) {
                        let image_id = obj["xdr:pic"]["xdr:blipFill"]["a:blip"]["@_r:embed"];

                        adding_row(
                            from["xdr:col"], 
                            {
                                image: rels_images[image_id]
                            }
                        );
                    }
                }
            }
            
            // Перебираем все столбцы строки
            for(let key in sheet_row_data) {
                let regex = /(.*)_(\d+)/;

                let index = 0;
                if (regex.test(key)) {
                    let index_regex = regex.exec(key);

                    if(index_regex?.length === 3) {
                        index = parseInt(index_regex[2]);
                    }
                }

                adding_row(index, {text: sheet_row_data[key]})
            }

            normalize_table.push(final_row);
        }

        // Создание необходимых директорий 
        const path_save_tests = path.join(global.GLOBAL_DIR, "tests");
        if(!fs.existsSync(path_save_tests))
            fs.mkdirSync(path_save_tests)
        const test_save_root_path = path.join(path_save_tests, table_name);
        if(!fs.existsSync(test_save_root_path))
            fs.mkdirSync(test_save_root_path)
        const test_save_media_path = path.join(test_save_root_path, "media");
        if(!fs.existsSync(test_save_media_path))
            fs.mkdirSync(test_save_media_path)

        // Структура теста
        const test_structure: any = {
            theme: sheet_data[0]["__EMPTY_2"],
            list: []
        };

        // Парсим нормализированную таблицу в новый вид
        for(let rId = 0; rId < normalize_table.length; rId++) {
            const current_row = normalize_table[rId];

            // Записываем необходимые данные о вопросе
            const type = current_row["2"].text;
            const theme = current_row["3"].text;
            const lvl = current_row["4"].text;
            const is_milestone = (current_row["8"].text === "1") ? true : false;
            const text = current_row["10"].text;

            // Ответы
            const answers = [];
            const questions = [];

            // Данные о тесте
            let test_data;

            // Индекс начала просчётов
            const column_option_start_index = 11;

            // Далее в зависимости от типа
            switch(type) {
                // Один вариант вопроса, один правильный ответ, несколько вариантов
                case QUESTION_TYPES.OO: 
                    for(let elId = column_option_start_index + 1; elId < Object.keys(current_row).length; elId += 2) {
                        const el = current_row[elId.toString()];
                        let isCorrect = false;
                        
                        // Если это первый ответ - значит он верный
                        if(column_option_start_index === elId)
                            isCorrect = true;

                        // Создаём объект ответа
                        const data = {
                            text: el.text,
                            image: undefined,
                            isCorrect
                        };

                        // Экспортируем изображения (если имеются)
                        if(el.image && typeof el.image !== "string" ) {
                            const image_path = path.join(test_save_media_path, el.image.name);
                            fs.renameSync(el.image.path, image_path);
                            data.image = image_path;
                        }

                        // Заносим ответ на вопрос
                        answers.push(data);
                    }

                    test_data = {
                        type,
                        theme,
                        lvl,
                        is_milestone,
                        text,
                        answers,
                    };
                    break;

                // Один вопрос, несколько возможных вариантов ответа
                case QUESTION_TYPES.MO: 
                    let el_number = 1;
                    for(let elId = column_option_start_index + 1; elId < Object.keys(current_row).length; elId += 2) {
                        const el = current_row[elId.toString()];
                        const correct_number = current_row[column_option_start_index.toString()].text;
                        let isCorrect = false;

                        // Если это первый ответ - значит он верный
                        if(el_number === correct_number)
                            isCorrect = true;

                        // Создаём объект ответа
                        const data = {
                            text: el.text,
                            image: undefined,
                            isCorrect
                        };

                        // Экспортируем изображения (если имеются)
                        if(el.image && typeof el.image !== "string" ) {
                            const image_path = path.join(test_save_media_path, el.image.name);
                            fs.renameSync(el.image.path, image_path);
                            data.image = image_path;
                        }

                        // Заносим ответ на вопрос
                        answers.push(data);

                        el_number++;
                    }

                    test_data = {
                        type,
                        theme,
                        lvl,
                        is_milestone,
                        text,
                        answers,
                    };
                    break;

                // Несколько вариантов вопроса, несколько вариантов ответа
                case QUESTION_TYPES.OOMQ:
                case QUESTION_TYPES.COS: 
                    // Добавление ответов
                    for(let elId = column_option_start_index + 1; elId < Object.keys(current_row).length; elId += 2) {
                        const el = current_row[elId.toString()];

                        // Создаём объект ответа
                        const data = {
                            text: el.text,
                            image: undefined
                        };

                        // Экспортируем изображения (если имеются)
                        if(el.image && typeof el.image !== "string" ) {
                            const image_path = path.join(test_save_media_path, el.image.name);
                            fs.renameSync(el.image.path, image_path);
                            data.image = image_path;
                        }

                        // Заносим ответ на вопрос
                        answers.push(data);
                    }
                    
                    // Добавление вопросов
                    let question_index = 0;
                    for(let elId = column_option_start_index; elId < Object.keys(current_row).length; elId += 2) {
                        const el = current_row[elId.toString()];

                        // Создаём объект вопроса
                        const data = {
                            text: el.text,
                            image: undefined
                        };

                        // Экспортируем изображения (если имеются)
                        if(el.image && typeof el.image !== "string" ) {
                            const image_path = path.join(test_save_media_path, el.image.name);
                            fs.renameSync(el.image.path, image_path);
                            data.image = image_path;
                        }

                        // Заносим вопрос
                        questions.push(data);

                        question_index++;
                    }

                    test_data = {
                        type,
                        theme,
                        lvl,
                        is_milestone,
                        text,
                        answers,
                        questions
                    };
                    break;

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
            }

            // Добавить новый вопрос в лист теста
            test_structure.list.push(test_data);
        }

        // Записываем структуру в файл
        fs.writeFileSync(path.join(test_save_root_path, "structure.json"), JSON.stringify(test_structure));
        // Удаляем лишний мусор после работы
        fs.rmSync(table_source_path, { recursive: true });

        return true;
    });
}

module.exports = {
    normalizeTable
}