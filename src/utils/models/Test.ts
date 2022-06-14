import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс test
export interface ITest {
  moduleId: Types.ObjectId;
  accountId: Types.ObjectId;
  close?: boolean;
  createDate?: Date;
  closeDate?: Date;
  questions: Array<IQuestionTest>;
}

// элемент списка
interface IQuestionTest {
  questionId: Types.ObjectId;
  answerIds: Array<Types.ObjectId>;
  answerAccountId?: Types.ObjectId;
  answerAccountIds?: Array<Types.ObjectId>;
  isCorrect?: Boolean;
}

// расширенный тип
interface TestType extends ITest, Document { }
interface QuestionTestType extends IQuestionTest, Document { }

// интерфейс модели
interface TestModel extends Model<TestType> { }
interface QuestionTestModel extends Model<QuestionTestType> { }

// схема задач
const QuestionSchema = new Schema<QuestionTestType, QuestionTestModel, QuestionTestType>({
  questionId: { type: Schema.Types.ObjectId, ref: EModels.questions },
  answerIds: [{ type: Schema.Types.ObjectId, ref: EModels.answers }],
  answerAccountId: { type: Schema.Types.ObjectId, ref: EModels.answers, default: undefined },
  answerAccountIds: [{ type: Schema.Types.ObjectId, ref: EModels.answers, default: undefined }],
  isCorrect: { type: Boolean, default: false }
}, { _id: false });

// схема
const NewSchema = new Schema<TestType, TestModel, TestType>({
  moduleId: { type: Schema.Types.ObjectId, required: true, ref: EModels.modules },
  accountId: { type: Schema.Types.ObjectId, required: true, ref: EModels.users },
  close: { type: Boolean, require: true, default: false },
  createDate: { type: Date, default: (new Date()) },
  closeDate: { type: Date, default: undefined },
  questions: [QuestionSchema]
});

// экспорт самой модели
export const Tests: TestModel = <TestModel>(
  model(EModels.tests, NewSchema)
);
