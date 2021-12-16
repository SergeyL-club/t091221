import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс answer
export interface IAnswer {
  desc: string
  img?: string
}


// расширенный тип
interface AnswerType extends IAnswer, Document{

}

// интерфейс модели 
interface AnswerModel extends Model<AnswerType>{

}

// схема
const NewSchema = new Schema<AnswerType, AnswerModel, AnswerType>({
  desc: { type: String, required: true },
  img: { type: String, required: true },
})

// экспорт самой модели
export const Answers: AnswerModel = <AnswerModel>model(EModels.answers, NewSchema)