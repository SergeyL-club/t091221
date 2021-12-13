import { Schema } from 'mongoose'
import { IRole } from '../utils/models/Role';

export interface IAccount {
  _id: Schema.Types.ObjectId
  login: string,
  password: string,
  role: IRole
  tokens: Array<String>
}