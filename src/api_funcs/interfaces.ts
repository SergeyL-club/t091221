import { IRole } from '../utils/models/Role'

export interface IAccount {
  login: string
  role: IRole
  FIO: {
    firstName: string
    middleName: string
    lastName: string
  }
  mail: string
  tel: string
}