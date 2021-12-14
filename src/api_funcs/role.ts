import { ApiError } from "../utils/apiError"
import { Roles } from "../utils/models/Role"
import { IAccount } from "./interfaces"

interface inputSetRole {
  name: string
  isAdminFun?: boolean
  isClientFun?: boolean
  isExecutorFun?: boolean
}

const instanceOfISR = ( object: any ): object is inputSetRole => {
  return "name" in object
}

const setRole = async( account: IAccount, data: inputSetRole | undefined ) => {

  // проверки  
  if(!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`) 
  }
  if( !(data) || !(instanceOfISR(data)) ) {
    throw new ApiError(400, `Not enough input`)
  }
  if(await Roles.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // создание роли
  let newRoleDoc = new Roles({
    name: data.name,
    isAdminFun: (data.isAdminFun) ? data.isAdminFun : false,
    isClientFun: (data.isClientFun) ? data.isClientFun : false,
    isExecutorFun: (data.isExecutorFun) ? data.isExecutorFun : false
  }) 

  // сохранение в БД
  newRoleDoc.save()

  return { 
    newRole: newRoleDoc
  }
}


module.exports = {
  setRole,
}