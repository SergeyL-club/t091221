import { ApiError } from "../utils/apiError";
import { Services } from "../utils/models/Service";
import { IAccount } from "./interfaces";

interface inputSetService{
  name: string
}

const setService = async(account: IAccount, data: inputSetService | undefined) => {
  
  // проверки
  if(account.role.name !== "admin") {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data) {
    throw new ApiError(400, `Not enough input`)
  }
  if(await Services.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // сощдание новой услуги
  let newServiceDoc = new Services({
    name: data.name
  })

  // запись в БД
  newServiceDoc.save()

  // возвращения создданной услуги
  return {
    newService: newServiceDoc
  }
}

module.exports = {
  setService
}