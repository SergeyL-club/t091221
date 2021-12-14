import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс role
export interface IRole {
  name: string
  isAdminFun: boolean
  isClientFun: boolean
  isExecutorFun: boolean
}


// расширенный тип
interface RoleType extends IRole, Document{

}

// интерфейс модели 
interface RoleModel extends Model<RoleType>{

}

// схема
const NewSchema = new Schema<RoleType, RoleModel, RoleType>({
  name: { type: String, required: true, unique: true },
  isAdminFun: { type: Boolean, required: true, default: false },
  isClientFun: { type: Boolean, required: true, default: false },
  isExecutorFun: { type: Boolean, required: true, default: false }
})

// экспорт самой модели
export const Roles: RoleModel = <RoleModel>model(EModels.roles, NewSchema)