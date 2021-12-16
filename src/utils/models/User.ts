import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// глобальные константы
type ObjectId = Schema.Types.ObjectId
const ObjectId = Schema.Types.ObjectId

// интерфейс user
export interface IUser {
  nickname: string
  passwordHash: string
  role: ObjectId
  FIO: {
    firstName: string
    middleName: string
    lastName: string
  }
  mail: string
}


// расширенный тип
interface UserType extends IUser, Document{

}

// интерфейс модели 
interface UserModel extends Model<UserType>{

}

// схема
const NewSchema = new Schema<UserType, UserModel, UserType>({
  nickname: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: ObjectId, required: true, ref: EModels.roles },
  FIO: {
    firstName: { type: String, require: true },
    middleName: { type: String, require: true },
    lastName: { type: String, require: true },
  },
  mail: { type: String,  require: true }
})

// экспорт самой модели
export const Users: UserModel = <UserModel>model(EModels.users, NewSchema)