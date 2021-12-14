import { ApiError } from "../utils/apiError"
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

  return { account }
}

const test = async(account: IAccount | undefined, data: inputSetRole | undefined ) => {
  return { account }
}

module.exports = {
  setRole,
  test
}