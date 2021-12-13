import { ApiError } from "../utils/apiError"
import { Roles } from "../utils/models/Role"
import { IAccount } from "./interfaces"

interface inputSetRole {
  name: string
}

const setRole = async(account: IAccount, data: inputSetRole | undefined ) => {

  if(!data) {
    throw new ApiError(400, `Not enough input`)
  }

  if(account.role.name !== "admin") {
    throw new ApiError(403, `Can't access this request`) 
  }

  let newRoleDoc = new Roles({
    name: data.name
  }) 

  newRoleDoc.save()

  return { 
    newRole: newRoleDoc
  }
}

module.exports = {
  setRole
}