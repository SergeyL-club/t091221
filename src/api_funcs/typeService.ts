import { ApiError } from "../utils/apiError";
import { TypeServices } from "../utils/models/TypeService";
import { IAccount } from "./interfaces";

interface inputSetTypeService {
  name: string
}

const setTypeService = async ( account: IAccount, data: inputSetTypeService ) => {
  
  // проверки
  if(account.role.name !== "admin") {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data) {
    throw new ApiError(400, `Not enough input`)
  }

  if(await TypeServices.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // создание типа услуги
  let newTypeServiceDoc = new TypeServices({
    name: data.name
  })

  // запись в БД
  newTypeServiceDoc.save()

  // возвращение созданного типа
  return {
    newTypeService: newTypeServiceDoc
  }
}

module.exports = {
  setTypeService
}