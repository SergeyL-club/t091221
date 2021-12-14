import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { TypeServices } from "../utils/models/TypeService";
import { IAccount } from "./interfaces";

// интерфейс input регистрации типа сервиса
interface inputSetTypeService {
  name: string
}

// функция проверки всех параметров input
const instanceOfIST = ( object: any ): object is inputSetTypeService => {
  return "name" in object
}

// api регистрация типа сервиса
const setTypeService = async ( account: IAccount, data: inputSetTypeService ) => {
  
  // проверки
  if(!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data || !instanceOfIST(data)) {
    throw new ApiError(400, `Not enough input`)
  }
  if(await TypeServices.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // создание и сохранение типа услуги
  let newTypeServiceDoc = await TypeServices.create({
    name: data.name
  }).catch(e => {
    // если произошла ошибка
    if(e.code === 11000) throw new ApiError(409, `Duplicate name`)
    else logger.error(e)
  })

  // проверка типа услуги
  if(newTypeServiceDoc) {
    return {
      newTypeService: newTypeServiceDoc
    }
  } else {
    throw new ApiError(403, `Registration type service failed`)
  }
}

// экспорт api функций
module.exports = {
  setTypeService
}