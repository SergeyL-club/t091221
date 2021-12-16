import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс module
export interface IModule {
  name: string
  desc: string
  lvl: number
  childId: Schema.Types.ObjectId
  questions: Array<Schema.Types.ObjectId>
}


// расширенный тип
interface ModuleType extends IModule, Document{

}

// интерфейс модели 
interface ModuleModel extends Model<ModuleType>{

}

// схема
const NewSchema = new Schema<ModuleType, ModuleModel, ModuleType>({
  name: { type: String, required: true, unique: true },
  desc: { type: String, required: true, default: "" },
  lvl: { type: Number, required: true, default: 0 },
  childId: { type: Schema.Types.ObjectId, ref: EModels.modules },
  questions: [{ type: Schema.Types.ObjectId, ref: EModels.questions }],
})

// экспорт самой модели
export const Modules: ModuleModel = <ModuleModel>model(EModels.modules, NewSchema)