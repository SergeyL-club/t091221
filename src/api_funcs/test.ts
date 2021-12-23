import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Answers } from "../utils/models/Answer";
import { Modules } from "../utils/models/Module";
import { Questions } from "../utils/models/Question";
import { IAccount } from "./interfaces";

// интерфейс input старт тесты
interface inputStartTest {
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfIST = (object: any): object is inputStartTest => {
  return "moduleId" in object;
};

// функция перемешания массива
function shuffle(array: Array<any>) {
  array.sort(() => Math.random() - 0.5);
}

// api старт теста
const startTest = async (account: IAccount, data: inputStartTest) => {
  // проверки
  if (!data || !instanceOfIST(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  let moduleCandidate: any;
  if (
    !(moduleCandidate = await Modules.findOne({
      _id: new Types.ObjectId(data.moduleId),
    }))
  ) {
    throw new ApiError(400, `Module undefined`);
  }
  if (
    (moduleCandidate.questionIds && moduleCandidate.questionIds.length === 0) ||
    typeof moduleCandidate.questionIds === "undefined"
  ) {
    throw new ApiError(400, `Module questions undefined`);
  }

  moduleCandidate = await Modules.aggregate([
    {
      $match: {
        _id: moduleCandidate._id,
      },
    },
    {
      $lookup: {
        from: Questions.modelName,
        localField: "questionIds._id",
        foreignField: "_id",
        as: "questions",
        pipeline: [
          {
            $lookup: {
              from: Answers.modelName,
              localField: "answerIds",
              foreignField: "_id",
              as: "answers",
            },
          },
          {
            $lookup: {
              from: Answers.modelName,
              localField: "correctAnswerId",
              foreignField: "_id",
              as: "correctAnswer",
            },
          },
          {
            $lookup: {
              from: Answers.modelName,
              localField: "correctAnswerIds",
              foreignField: "_id",
              as: "correctAnswers",
            },
          },
          {
            $project: {
              answerIds: 0,
              correctAnswerId: 0,
              correctAnswerIds: 0,
            },
          },
        ],
      },
    },
    {
      $project: {
        name: 1,
        questions: {
          $map: {
            input: {
              $zip: { inputs: ["$questionIds", "$questions"] },
            },
            as: "el",
            in: {
              milestone: { $arrayElemAt: ["$$el.milestone", 0] },
              question: { $arrayElemAt: ["$$el", 1] },
            },
          },
        },
      },
    },
  ]);

  let count = 5;

  let questions: any[] = moduleCandidate[0].questions;
  let randQuestion = [];
  if (questions) {
    for (let i = 0; i < count; i++) {
      shuffle(questions);
      const questionM = questions.pop();
      let answersArray = [];

      if (
        questionM.question.correctAnswer &&
        questionM.question.correctAnswer.length === 1
      ) {
        answersArray.push({
          answer: questionM.question.correctAnswer[0],
          isCorrect: true,
        });
      } else if (
        questionM.question.correctAnswers &&
        questionM.question.correctAnswers.length > 0
      ) {
        for (let i = 0; i < questionM.question.correctAnswers.length; i++) {
          const answer = questionM.question.correctAnswers[i];
          answersArray.push({
            answer,
            isCorrect: true,
          });
        }
      }
      if (answersArray.length < 4) {
        let count = answersArray.length;
        for (let i = 0; i < 4 - count; i++) {
          let answers = questionM.question.answers;
          if (answers) {
            shuffle(answers);
            answersArray.push({
              answer: answers.pop(),
              isCorrect: false,
            });
          }
        }
      }

      shuffle(answersArray);
      randQuestion.push({
        _id: questionM.question._id,
        type: questionM.question.type,
        desc: questionM.question.desc,
        answers: answersArray,
      });
    }
  }

  //TODO: дописать создание самого теста (сохранение его)

  // возвращение ответа
  return {
    module: {
      _id: moduleCandidate[0]._id,
      name: moduleCandidate[0].name,
      questions: randQuestion,
    },
  };
};

// экспорт api
module.exports = {
  startTest,
};
