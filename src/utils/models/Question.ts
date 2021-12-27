import { model, Schema, Model, Document } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс question
export interface IQuestion {
  desc: string;
  lvl: number;
  type: string;
  img?: Array<string>;
  answerIds: Array<Schema.Types.ObjectId>;
  correctAnswerId?: Schema.Types.ObjectId;
  correctAnswerIds?: Array<Schema.Types.ObjectId>;
}

// расширенный тип
interface QuestionType extends IQuestion, Document { }

// интерфейс модели
interface QuestionModule extends Model<QuestionType> { }

// список типов
export enum ETypeQuestion {
  oneCorrect = "oneCorrect",
  manyCorrect = "manyCorrect",
}

// схема
const NewSchema = new Schema<QuestionType, QuestionModule, QuestionType>({
  desc: { type: String, required: true },
  lvl: { type: Number, required: true, default: 0 },
  img: [{ type: String }],
  type: { type: String, required: true, enum: ETypeQuestion },
  answerIds: [{ type: Schema.Types.ObjectId, ref: EModels.answers }],
  correctAnswerId: { type: Schema.Types.ObjectId, ref: EModels.answers },
  correctAnswerIds: [{ type: Schema.Types.ObjectId, ref: EModels.answers }],
});

// экспорт самой модели
export const Questions: QuestionModule = <QuestionModule>(
  model(EModels.questions, NewSchema)
);
