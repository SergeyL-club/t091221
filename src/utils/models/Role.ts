import {model, Schema, Model, Document } from 'mongoose';

// интерфейс user
export interface IRole {
  name: string
}


// расширенный тип
interface RoleType extends IRole, Document{

}

// интерфейс модели 
interface RoleModel extends Model<RoleType>{

}

// схема
const NewSchema = new Schema<RoleType, RoleModel, RoleType>({
  name: { type: String, required: true, unique: true }
})

// экспорт самой модели
export const Roles: RoleModel = <RoleModel>model("Roles", NewSchema)