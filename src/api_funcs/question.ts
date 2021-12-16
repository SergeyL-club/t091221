import { ApiError } from "../utils/apiError";
import { Answers, IAnswer } from "../utils/models/Answer";
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
interface inputRemQuestion {
  questionId: string;
}

// функция проверки всех параметров input
const instanceOfIRQ = (object: any): object is inputRemQuestion => {
  return "questionId" in object;
};

const remQuestion = async (account: IAccount, data: inputRemQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRQ(data)) {
    throw new ApiError(400, `Not enough input`);
  }
};

// экспорт api функций
module.exports = {
  setQuestion,
  remQuestion,
};
