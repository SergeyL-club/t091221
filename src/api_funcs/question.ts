import { Types, Schema } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Answers, IAnswer } from "../utils/models/Answer";
import { Modules } from "../utils/models/Module";
import { ETypeQuestion, Questions } from "../utils/models/Question";
import { IAccount } from "./interfaces";
import fs, { ReadStream } from "fs";
import { resolve } from "path";

// интерфейс input регистрации задачи
interface inputSetQuestion {
  desc: string;
  lvl: number;
  type: string;
  img?: ReadStream | Array<ReadStream>;
  answers: string | Array<IAnswer>;
  correctAnswer?: string | IAnswer;
  correctAnswers?: string | Array<IAnswer>;
}

// функция проверки всех параметров input
const instanceOfISQ = (object: any): object is inputSetQuestion => {
  return (
    "desc" in object &&
    "lvl" in object &&
    "type" in object &&
    "answers" in object &&
    ("correctAnswer" in object || "correctAnswers" in object)
  );
};

// api регистрация задачи
const setQuestion = async (account: IAccount, data: inputSetQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISQ(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (data.correctAnswer && data.correctAnswers) {
    throw new ApiError(400, `Correct answer or correct answers`);
  }
  let why =
    (data.type === ETypeQuestion.manyCorrect && data.correctAnswer) ||
    (data.type === ETypeQuestion.oneCorrect && data.correctAnswers);
  if (why) {
    throw new ApiError(400, `Wrong set of answers for the type of question`);
  }
  if (typeof data.answers === "string") {
    data.answers = JSON.parse(data.answers);
  }
  if (typeof data.correctAnswers === "string") {
    data.correctAnswers = JSON.parse(data.correctAnswers);
  }
  if (typeof data.correctAnswer === "string") {
    data.correctAnswer = JSON.parse(data.correctAnswer);
  }
  if (data.answers.length < 3) {
    throw new ApiError(400, `Answers lenght more 3`);
  }

  // создание или поиск ответов
  let answerIds = [];
  if (typeof data.answers === "object") {
    for (let i = 0; i < data.answers.length; i++) {
      const answer = data.answers[i];
      let newAnswer = await Answers.create({
        desc: answer.desc,
        img: answer.img ? answer.img : undefined,
      });
      if (newAnswer) answerIds.push(newAnswer._id);
    }
  }

  // создание или поиск правыльного ответа
  let correctAnswer;
  if (data.correctAnswer && typeof data.correctAnswer === "object") {
    let newAnswer = await Answers.create({
      desc: data.correctAnswer.desc,
      img: data.correctAnswer.img ? data.correctAnswer.img : undefined,
    });
    if (newAnswer) {
      correctAnswer = newAnswer._id;
    }
  }

  // создание или поиск правыльных ответов
  let correctAnswers = [];
  if (data.correctAnswers && typeof data.correctAnswers === "object") {
    for (let i = 0; i < data.correctAnswers.length; i++) {
      const correctAnswer = data.correctAnswers[i];
      let newAnswer = await Answers.create({
        desc: correctAnswer.desc,
        img: correctAnswer.img ? correctAnswer.img : undefined,
      });
      if (newAnswer) {
        correctAnswers.push(newAnswer._id);
      }
    }
  }

  // создание задачи
  let newQuestionDoc = new Questions();
  newQuestionDoc.desc = data.desc;
  newQuestionDoc.lvl = data.lvl;
  newQuestionDoc.type = data.type;
  newQuestionDoc.answerIds = answerIds;
  newQuestionDoc.correctAnswerId = correctAnswer ? correctAnswer : undefined;
  newQuestionDoc.correctAnswerIds = correctAnswers ? correctAnswers : undefined;


  // проверка картинки
  if (data.img) {
    newQuestionDoc.img = [];
    // создание репозитория   
    await fs.promises.mkdir(
      resolve(__dirname, `../../statics/imgQuestion/${newQuestionDoc._id}`),
      { recursive: true }
    );
    if (Array.isArray(data.img)) {
      for (let i = 0; i < data.img.length; i++) {
        const imgOne = data.img[i];

        // data
        let fileContent = await fs.promises.readFile(imgOne.path);

        // save
        await fs.promises.writeFile(resolve(__dirname, `../../statics/imgQuestion/${newQuestionDoc._id}/img${i}.png`), fileContent);
        newQuestionDoc.img.push(`/statics/imgQuestion/${newQuestionDoc._id}/img${i}.png`);
      }
    } else {
      // data
      let fileContent = await fs.promises.readFile(data.img.path);

      // save
      await fs.promises.writeFile(resolve(__dirname, `../../statics/imgQuestion/${newQuestionDoc._id}/img1.png`), fileContent);
      newQuestionDoc.img.push(`/statics/imgQuestion/${newQuestionDoc._id}/img1.png`);
    }
  }
  if (!(await newQuestionDoc.save())) {
    // если произошла ошибка
    throw new ApiError(400, `Save question error`);
  }

  // проверка задачи
  if (newQuestionDoc) {
    return {
      newQuestion: newQuestionDoc,
    };
  } else {
    throw new ApiError(400, `Registration question failed`);
  }
};

// интерфейс input удаление задачи
interface inputRemQuestion {
  questionId: string;
}

// функция проверки всех параметров input
const instanceOfIRQ = (object: any): object is inputRemQuestion => {
  return "questionId" in object;
};

// api удаление задания
const remQuestion = async (account: IAccount, data: inputRemQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRQ(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (
    !(await Questions.findOne({ _id: new Types.ObjectId(data.questionId) }))
  ) {
    throw new ApiError(400, `Question undefined`);
  }

  // поиск родителей модулю
  let parents = await Modules.find({
    questionIds: {
      $in: [
        { _id: new Types.ObjectId(data.questionId), milestone: true },
        { _id: new Types.ObjectId(data.questionId), milestone: false },
      ],
    },
  });

  // убираем связи
  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    Modules.conQuestion(
      parent._id,
      new Types.ObjectId(data.questionId),
      false,
      false
    );
  }


  // удаление всех ответов
  let questionDel = await Questions.findOne({
    _id: new Types.ObjectId(data.questionId),
  });

  // удаление картинки
  if (questionDel && questionDel.img) {
    await fs.promises.rmdir(resolve(__dirname, `../../statics/imgQuestion/${questionDel._id}`), { recursive: true });
  }

  // удаление ответов
  if (questionDel) {
    await Answers.remove({
      _id: questionDel.answerIds,
    });
    if (questionDel.correctAnswerId) {
      await Answers.remove({
        _id: questionDel.correctAnswerId,
      });
    }
    if (questionDel.correctAnswerIds) {
      await Answers.remove({
        _id: questionDel.correctAnswerIds,
      });
    }
  }

  // удаление задачи
  if (questionDel) {
    await Questions.remove({
      _id: questionDel._id,
    });
    return { Ok: true, delete: true, questionDel };
  } else return { Ok: false };
};

// интерфейс input toggle соединения задачи с модулем
interface inputToggleConQuestion {
  questionId: string;
  moduleId: string;
  milestone?: boolean;
}

// функция проверки всех параметров input
const instanceOfITCQ = (object: any): object is inputToggleConQuestion => {
  return "questionId" in object && "moduleId" in object;
};

// api toggle соединения задачи с модулем
const toggleConQuestion = async (
  account: IAccount,
  data: inputToggleConQuestion
) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfITCQ(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.moduleId) }))) {
    throw new ApiError(400, `Module undefined`);
  }
  if (
    !(await Questions.findOne({ _id: new Types.ObjectId(data.questionId) }))
  ) {
    throw new ApiError(400, `Question undefined`);
  }

  if (
    await Modules.findOne({
      _id: new Types.ObjectId(data.moduleId),
      questionIds: {
        $in: [
          { _id: new Types.ObjectId(data.questionId), milestone: true },
          { _id: new Types.ObjectId(data.questionId), milestone: false },
        ],
      },
    })
  ) {
    let candidateModule = await Modules.findOne({
      _id: new Types.ObjectId(data.moduleId),
    });
    // проверки на сощуствования
    if (candidateModule && candidateModule.questionIds) {
      for (let i = 0; i < candidateModule.questionIds.length; i++) {
        const candidateQuestion = candidateModule.questionIds[i];
        // изменение milestone
        if (
          candidateQuestion._id.toString() === data.questionId &&
          candidateQuestion.milestone !== data.milestone &&
          data.milestone
        ) {
          if (
            await Modules.conQuestion(
              new Types.ObjectId(data.moduleId),
              new Types.ObjectId(data.questionId),
              data.milestone,
              true
            )
          )
            return { Ok: true, update: true, data };
          else return { Ok: false };
        }
        // удаление
        else if (
          candidateQuestion._id.toString() === data.questionId &&
          !data.milestone
        ) {
          if (
            await Modules.conQuestion(
              new Types.ObjectId(data.moduleId),
              new Types.ObjectId(data.questionId),
              false,
              false
            )
          )
            return { Ok: true, delete: true, data };
          else return { Ok: false };
        }
      }

      // добавление default
      if (
        await Modules.conQuestion(
          new Types.ObjectId(data.moduleId),
          new Types.ObjectId(data.questionId),
          false,
          true
        )
      ) {
        data.milestone = false;
        return { Ok: true, create: true, data };
      } else return { Ok: false };
    }
  }
  // добавление
  else if (
    data.milestone &&
    (await Modules.conQuestion(
      new Types.ObjectId(data.moduleId),
      new Types.ObjectId(data.questionId),
      data.milestone,
      true
    ))
  )
    return { Ok: true, create: true, data };
  else {
    // добавление default
    if (
      await Modules.conQuestion(
        new Types.ObjectId(data.moduleId),
        new Types.ObjectId(data.questionId),
        false,
        true
      )
    ) {
      data.milestone = false;
      return { Ok: true, create: true, data };
    } else return { Ok: false };
  }
};

// экспорт api функций
module.exports = {
  setQuestion,
  remQuestion,
  toggleConQuestion,
};
