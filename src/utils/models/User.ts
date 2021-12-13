import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// глобальные константы
type ObjectId = Schema.Types.ObjectId
const ObjectId = Schema.Types.ObjectId

// интерфейс user
export interface IUser {
  login: string
  password: string
  role: ObjectId
  tokens: Array<String>
}


// расширенный тип
interface UserType extends IUser, Document{

}

// интерфейс модели 
interface UserModel extends Model<UserType>{

}

// схема
const NewSchema = new Schema<UserType, UserModel, UserType>({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: ObjectId, required: true, ref: EModels.roles },
  tokens: [ { type: String } ]
})

// экспорт самой модели
export const Users: UserModel = <UserModel>model(EModels.users, NewSchema)