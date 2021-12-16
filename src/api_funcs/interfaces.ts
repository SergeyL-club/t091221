import { IRole } from '../utils/models/Role'

export interface IAccount {
  nickname: string
  role: IRole
  FIO: {
    firstName: string
    middleName: string
    lastName: string
  }
  mail: string
}