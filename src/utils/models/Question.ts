import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс question
export interface IQuestion {
  desc: string
  lvl: number
  type: string
  answers: Array<Schema.Types.ObjectId>
  correctAnswer?: Schema.Types.ObjectId
  correctAnswers?: Array<Schema.Types.ObjectId> 
}


// расширенный тип
interface QuestionType extends IQuestion, Document{

}

// интерфейс модели 
interface QuestionModule extends Model<QuestionType>{

}

// схема
const NewSchema = new Schema<QuestionType, QuestionModule, QuestionType>({
  desc: { type: String, required: true },
  lvl: { type: Number, required: true, default: 0 },
  answers: [{ type: Schema.Types.ObjectId, ref: EModels.answers }],
  correctAnswer: { type: Schema.Types.ObjectId, ref: EModels.answers },
  correctAnswers: [{ type: Schema.Types.ObjectId, ref: EModels.answers }],
})

// экспорт самой модели
export const Questions: QuestionModule = <QuestionModule>model(EModels.questions, NewSchema)