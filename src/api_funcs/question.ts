import { Types, Schema } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Answers, IAnswer } from "../utils/models/Answer";
import { Modules } from "../utils/models/Module";
import { ETypeQuestion, Questions } from "../utils/models/Question";
import { IAccount } from "./interfaces";

// интерфейс input регистрации задачи
interface inputSetQuestion {
  desc: string;
  lvl: number;
  type: string;
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
  if (data.answers.length > 3) {
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

  // создание и сохранение задачи
  let newQuestionDoc = await Questions.create({
    desc: data.desc,
    lvl: data.lvl,
    type: data.type,
    answerIds,
    correctAnswerId: correctAnswer ? correctAnswer : undefined,
    correctAnswerIds: correctAnswers ? correctAnswers : undefined,
  }).catch((e) => {
    // если произошла ошибка
    throw new ApiError(400, `Save question error`);
  });

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
interface inputSetConQuestion {
  questionId: string;
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfISCQ = (object: any): object is inputSetConQuestion => {
  return "questionId" in object && "moduleId" in object;
};

// api добавление связей к заданию
const setConQuestion = async (account: IAccount, data: inputSetConQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISCQ(data)) {
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

  let question = await Questions.findOne({
    _id: new Types.ObjectId(data.questionId),
  });

  // обновление связи
  if (question) {
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.moduleId) },
      {
        $addToSet: {
          questionIds: new Types.ObjectId(data.questionId),
        },
      }
    );
    return { Ok: true };
  } else return { Ok: false };
};

// интерфейс input удаление задачи
interface inputRemConQuestion {
  questionId: string;
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfIRCQ = (object: any): object is inputRemQuestion => {
  return "questionId" in object && "moduleId" in object;
};

// api добавление связей к заданию
const remConQuestion = async (account: IAccount, data: inputRemConQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISCQ(data)) {
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

  let question = await Questions.findOne({
    _id: new Types.ObjectId(data.questionId),
  });

  // обновление связи
  if (question) {
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.moduleId) },
      {
        $pull: {
          questionIds: new Types.ObjectId(data.questionId),
        },
      }
    );
    return { Ok: true };
  } else return { Ok: false };
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
      $in: [new Types.ObjectId(data.questionId)],
    },
  });

  // убираем связи
  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    remConQuestion(account, {
      questionId: data.questionId,
      moduleId: String(parent._id),
    });
  }

  // удаление всех ответов
  let questionDel = await Questions.findOne({
    _id: new Types.ObjectId(data.questionId),
  });
  if (questionDel) {
    await Answers.remove({
      _id: questionDel.answerIds,
    });
  }

  if (questionDel) {
    await Questions.remove({
      _id: questionDel._id,
    });
    return { Ok: true };
  } else return { Ok: false };
};

// экспорт api функций
module.exports = {
  setQuestion,
  remQuestion,
  setConQuestion,
  remConQuestion,
};
