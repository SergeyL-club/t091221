import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Answers } from "../utils/models/Answer";
import { Modules } from "../utils/models/Module";
import { ModuleAccounts } from "../utils/models/ModuleAccount";
import { Questions } from "../utils/models/Question";
import { Tests } from "../utils/models/Test";
import { IAccount } from "./interfaces";

// проверка на совпадение, если массив ответа пуст значит массивы совпадают (даже если порядок не правильный).
const diff = function (a1: Array<any>, a2: Array<any>) {
  return a1
    .filter((i) => !a2.includes(i))
    .concat(a2.filter((i) => !a1.includes(i)));
};

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
        let: {},
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
    for (let i = 0; i < questions.length; i++) {
      const questionM = questions[i];
      if (questionM.milestone) {
        questions = questions.filter((item) => item !== questionM);
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
  // shuffle
  shuffle(randQuestion);
  // сохранение теста
  let test = new Tests();
  test._id = new Types.ObjectId();
  test.moduleId = moduleCandidate[0]._id;
  test.accountId = account._id;
  for (let i = 0; i < randQuestion.length; i++) {
    const question = randQuestion[i];
    let arrayAnswers = [];
    for (let y = 0; y < question.answers.length; y++) {
      const answer = question.answers[y];
      arrayAnswers.push(answer.answer._id);
    }
    test.questions.push({
      questionId: question._id,
      answerIds: arrayAnswers,
    });
    test.questions[i].answerAccountId = undefined;
    test.questions[i].answerAccountIds = undefined;
  }
  console.log(test._id, test);

  // сохранение
  if (await test.save()) {
    // возвращение ответа
    return {
      module: {
        _id: moduleCandidate[0]._id,
        name: moduleCandidate[0].name,
        testId: test._id,
        questions: randQuestion,
      },
    };
  } else new ApiError(409, `Error in creeate test`);
};

// интерфейс input старт тесты
interface inputStopTest {
  testId: string;
  answers: string | Array<IAnswerAccount>;
}

// интерфейс answers
interface IAnswerAccount {
  questionId: string;
  accountAnswerId?: string;
  accountAnswerIds?: string;
}

// функция проверки всех параметров input
const instanceOfIStopT = (object: any): object is inputStopTest => {
  return "testId" in object;
};

// api завершение теста
const closeTest = async (account: IAccount, data: inputStopTest) => {
  // проверки
  if (!data || !instanceOfIStopT(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  let testCandidate;
  if (
    !(testCandidate = await Tests.findOne({
      _id: new Types.ObjectId(data.testId),
      accountId: account._id,
    }))
  ) {
    throw new ApiError(400, `No test`);
  }
  if (testCandidate.close) {
    throw new ApiError(409, `Test close`);
  }
  if (data.answers && typeof data.answers === "string") {
    data.answers = JSON.parse(data.answers);
  }

  // questionId, correctId or correctIds
  if (typeof data.answers === "object") {
    for (let i = 0; i < data.answers.length; i++) {
      const answer = data.answers[i];

      if (
        testCandidate.questions.findIndex(
          (item) => item.questionId.toString() === answer.questionId
        ) !== -1
      ) {
        if (answer.accountAnswerId) {
          // проверка задачи
          let index = testCandidate.questions.findIndex(
            (item) => item.questionId.toString() === answer.questionId
          );
          if (index !== -1) {
            let checkAnswer = false;

            // проверка из списка ответов
            for (
              let i = 0;
              i < testCandidate.questions[index].answerIds.length;
              i++
            ) {
              const answerId = testCandidate.questions[index].answerIds[i];
              if (answerId.toString() === answer.accountAnswerId) {
                checkAnswer = true;
                break;
              }
            }

            // сохранение
            if (checkAnswer) {
              testCandidate.questions[index].answerAccountId =
                new Types.ObjectId(answer.accountAnswerId);

              // проверка правильности ответа
              let question = await Questions.findOne({
                _id: testCandidate.questions[index].questionId,
              });
              if (
                question &&
                question.correctAnswerId &&
                question.correctAnswerId.toString() === answer.accountAnswerId
              ) {
                let moduleAccount = await ModuleAccounts.findOne({
                  accountId: account._id,
                  moduleId: testCandidate.moduleId,
                });

                if (moduleAccount) {
                  if (moduleAccount.correctAnswers) {
                    moduleAccount.correctAnswers.push(
                      testCandidate.questions[index].questionId
                    );
                    await moduleAccount.save();
                  } else {
                    moduleAccount.correctAnswers = [];
                    moduleAccount.correctAnswers.push(
                      new Types.ObjectId(
                        testCandidate.questions[index].questionId
                      )
                    );
                    await moduleAccount.save();
                  }
                } else {
                  let moduleAccount = await ModuleAccounts.create({
                    accountId: account._id,
                    moduleId: testCandidate.moduleId,
                    progress: 0,
                    correctAnswers: [],
                  });

                  if (moduleAccount.correctAnswers) {
                    moduleAccount.correctAnswers.push(
                      testCandidate.questions[index].questionId
                    );
                    await moduleAccount.save();
                  } else {
                    moduleAccount.correctAnswers = [];
                    moduleAccount.correctAnswers.push(
                      new Types.ObjectId(
                        testCandidate.questions[index].questionId
                      )
                    );
                    await moduleAccount.save();
                  }
                }
              }
            }
          }
        } else if (answer.accountAnswerIds) {
          // индекс задачи
          let index = testCandidate.questions.findIndex(
            (item) => item.questionId.toString() === answer.questionId
          );

          // списки ответов
          let arrayAnswerId = [];
          for (let i = 0; i < answer.accountAnswerIds.length; i++) {
            const textId = answer.accountAnswerIds[i];

            // проверка из списка ответов
            let checkAnswer = false;
            for (
              let i = 0;
              i < testCandidate.questions[index].answerIds.length;
              i++
            ) {
              const answerId = testCandidate.questions[index].answerIds[i];
              if (answerId.toString() === textId) {
                checkAnswer = true;
                break;
              }
            }
            if (checkAnswer) {
              arrayAnswerId.push(new Types.ObjectId(textId));
            }
          }
          testCandidate.questions[index].answerAccountIds = arrayAnswerId;
          let candidateQuestion = await Questions.findOne({
            _id: testCandidate.questions[index].questionId,
          });

          // проверка правильности ответа
          let array1: string[] = [];
          arrayAnswerId.forEach((id) => array1.push(id.toString()));

          if (candidateQuestion && candidateQuestion.correctAnswerIds) {
            let array2: string[] = [];
            candidateQuestion.correctAnswerIds.forEach(id => array2.push(id.toString()));

            if (diff(array1, array2).length === 0) {
              let moduleAccount = await ModuleAccounts.findOne({
                accountId: account._id,
                moduleId: testCandidate.moduleId,
              });

              if (moduleAccount) {
                if (moduleAccount.correctAnswers) {
                  moduleAccount.correctAnswers.push(
                    testCandidate.questions[index].questionId
                  );
                  await moduleAccount.save();
                } else {
                  moduleAccount.correctAnswers = [];
                  moduleAccount.correctAnswers.push(
                    new Types.ObjectId(
                      testCandidate.questions[index].questionId
                    )
                  );
                  await moduleAccount.save();
                }
              } else {
                let moduleAccount = await ModuleAccounts.create({
                  accountId: account._id,
                  moduleId: testCandidate.moduleId,
                  progress: 0,
                  correctAnswers: [],
                });

                if (moduleAccount.correctAnswers) {
                  moduleAccount.correctAnswers.push(
                    testCandidate.questions[index].questionId
                  );
                  await moduleAccount.save();
                } else {
                  moduleAccount.correctAnswers = [];
                  moduleAccount.correctAnswers.push(
                    new Types.ObjectId(
                      testCandidate.questions[index].questionId
                    )
                  );
                  await moduleAccount.save();
                }
              }
            }
          }
        }
      }
    }
  }

  // закрытие теста
  if (testCandidate) {
    testCandidate.closeDate = new Date();
    testCandidate.close = true;
    if (await testCandidate.save()) {
      return {
        Ok: true,
        close: true,
        closeDate: testCandidate.closeDate,
        questions: testCandidate.questions,
      };
    } else return { Ok: false };
  }
};

// экспорт api
module.exports = {
  startTest,
  closeTest,
};
