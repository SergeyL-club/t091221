import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс class
export interface IClass {
  char: string
  act: number
}


// расширенный тип
interface ClassType extends IClass, Document{

}

// интерфейс модели 
interface ClassModel extends Model<ClassType>{

}

// схема
const NewSchema = new Schema<ClassType, ClassModel, ClassType>({
  char: { type: String, required: true },
  act: { type: Number, required: true },
})

// экспорт самой модели
export const Classes: ClassModel = <ClassModel>model(EModels.classes, NewSchema)