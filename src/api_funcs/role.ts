import { ApiError } from "../utils/apiError"
import { Roles } from "../utils/models/Role"
import { IAccount } from "./interfaces"

interface inputSetRole {
  name: string
}

const setRole = async( account: IAccount, data: inputSetRole | undefined ) => {

  // проверки  
  if(account.role.name !== "admin") {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data) {
    throw new ApiError(400, `Not enough input`)
  }

  if(await Roles.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // создание роли
  let newRoleDoc = new Roles({
    name: data.name
  }) 

  // сохранение в БД
  newRoleDoc.save()

  return { 
    newRole: newRoleDoc
  }
}

const test = async(account: IAccount | undefined, data: inputSetRole | undefined ) => {
  return { account }
}

module.exports = {
  setRole,
  test
}