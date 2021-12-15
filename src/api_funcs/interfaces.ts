import { IRole } from '../utils/models/Role'

export interface IAccount {
  login: string
  password: string
  role: IRole
  FIO: {
    firstName: string
    middleName: string
    lastName: string
  }
  mail: string
  tel: string
}