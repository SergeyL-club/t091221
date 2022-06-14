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

import ExcelJS from "exceljs";

/**
 * Types of questions
 */
const QUESTION_TYPES = {
  OO: "oneCorrect",
  // OOMQ: "one_option_many_question",
  MO: "manyCorrect",
  // COS: "correct_option_sequence",
};

const questionTypes = [
  "oneCorrect",
  "manyCorrect"
];

const QuestionTypes = {
  oneCorrect: "oneCorrect",
  manyCorrect: "manyCorrect"
}

export const importTestNew = async(
  account: IAccount,
  path: string
) => {
  if (!fs.existsSync(path))
    throw new ApiError(500, "Table path incorrect");

  // Читаем файл, получаем первый лист
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const worksheet = workbook.getWorksheet(1);

  // Получение картинки (универсальная, уникальная в своём роде функция)
  const getImage = (row: string|number, column: string|number) => {
    const image = worksheet.getImages().filter(item => item.range.tl.nativeCol === (parseInt(column.toString())-1) && item.range.tl.nativeRow === (parseInt(row.toString())-1))[0];
    if (!image)
      return undefined;
    return workbook.getImage(parseInt(image.imageId));
  }

  // Перебираем строки
  for (let i = 7; i < worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);

    const type = row.getCell(3).value as string;
    const theme = row.getCell(4).value as string;
    let lvl = row.getCell(5).value;
    if (lvl === null) {
      lvl = 1;
    }
    const isMilestone = (row.getCell(9).value == "1") ? true : false;
    const descCell = row.getCell(11);
    const desc = descCell.value ?? "";
    const descImg = getImage(descCell.row, descCell.col);
    
    const questionStartIndex = 12;

    // Проверяем тип задания (если неверное, пропускаем)
    if (!questionTypes.includes(<string>type))
      continue;

    // Временные переменные
    const questions = [];
    const answers = [];
    const correctAnswers = [];

    switch (type) {
      case QuestionTypes.oneCorrect:        
        // Перебираем все ответы
        for (let i = questionStartIndex + 1; i < 20; i+=2) {
          // Получаем ответ или пропускам
          const answerCell = row.getCell(i);
          if (!answerCell)
            continue;
          const answerText = answerCell.value;
          const answerImage = getImage(answerCell.row, answerCell.col);

          answers.push({desc: answerText, img: answerImage});
        }

        let correctIndex = 0;
        // Перебираем все вопросы
        for (let i = questionStartIndex; i < 20; i+=2) {
          // Получаем вопрос или пропускам
          const questionCell = row.getCell(i);
          if (!questionCell)
            continue;
          const questionText = questionCell.value;
          const questionImage = getImage(questionCell.row, questionCell.col);

          // Получаем правильный ответ и массив с неправильными
          const answersCurrent = Array.from(answers);          
          const correctAnswer = answersCurrent[correctIndex];
          answersCurrent.splice(correctIndex, 1);

          questions.push(
            {
              type,
              lvl,
              desc: [desc, questionText].join(" "), 
              descImg: descImg?.buffer ?? questionImage?.buffer,
              answers: answersCurrent,
              correctAnswer
            }
          );

          correctIndex++;
        }
        break;
      case QuestionTypes.manyCorrect:
        // Перебираем все ответы
        for (let i = questionStartIndex + 1; i < 20; i+=2) {
          // Получаем ответ или пропускам
          const answerCell = row.getCell(i);
          if (!answerCell)
            continue;
          // Получаем маркер корректности или пропускаем
          const correctMarker = row.getCell(i-1);
          if (!correctMarker)
            continue;
          const answerText = answerCell.value;
          const answerImage = getImage(answerCell.row, answerCell.col);
          const answerObject = {desc: answerText, img: answerImage};

          if (correctMarker.value?.toString() === "1") {
            correctAnswers.push(answerObject);
          } else {
            answers.push(answerObject);
          }
        }

        questions.push(
          {
            type,
            lvl,
            desc,
            descImg: descImg?.buffer,
            answers: answers,
            correctAnswers
          }
        );

        break;
    }

    // Получаем или создаём новую тему данного вопроса
    let currentTheme;
    if (!(currentTheme = await Modules.findOne({name: theme}))) {
      currentTheme = await setModule(account, {name: theme, desc: "Автоматически созданная тема"});
    }

    // Создаём вопрос и связываем его с темой
    const currentQuestion = questions[0] as inputSetQuestion;
    console.log(questions);
    
    let createdQuestion;
    if (createdQuestion = await setQuestion(account, currentQuestion)) {
      console.log("LOG#2");
      //Если вопрос не создан
      if (!createdQuestion.newQuestion)
        continue;

        // Получаем ID текущей темы
        const themeModuleId = ("newModule" in currentTheme) ? currentTheme.newModule._id : currentTheme._id;
        // Связываем тему с вопросом
        await toggleConQuestion(account, {questionId: createdQuestion.newQuestion._id, moduleId: themeModuleId, milestone: isMilestone});
        console.log("LOG#3");
    }
  }

  return true;
}

/**
 * Import module map
 * @param account
 * @param table_path
 * @param module
 */
export const importModuleMap = async (
  account: IAccount,
  table_path: string
) => {
  if (!fs.existsSync(table_path))
    throw new ApiError(500, "Table path incorrect");

  // Созданные модули
  const created_modules = <any>{};

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(table_path);

  const worksheet = workbook.getWorksheet(1);
  for (let i = 3; i < worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);

    const lvl = <any>row.getCell(1).value > 1 ? -1 : 0;
    const parentKey = <any>row.getCell(2).value?.toString();
    const key = <any>row.getCell(4).value?.toString();
    const name = <any>row.getCell(5).value;
    const weight = <any>row.getCell(6).value;
    const type = <any>row.getCell(7).value || "Automatic";

    // Пропускаем строчку, если она пустая
    if (!key || !name || weight?.result === 1)
      continue;

    // Создаём или получаем текущий модуль
    let module;
    if (!(module = await Modules.findOne({ name: name })))
      module = await setModule(account, <inputSetModule>{ name, desc: type, lvl });

    // Заносим в наш массив
    created_modules[key] =
      "newModule" in module ? module.newModule._id : module._id;

    // Прикрепляем к родителю
    if (lvl === -1) {
      const parentId = created_modules[parentKey];
      await toggleConChild(account, <inputToggleConChilds>{
        parentId,
        childId: created_modules[key],
      });
    }
  }
}

module.exports = {
  importTestNew,
  importModuleMap,
};
