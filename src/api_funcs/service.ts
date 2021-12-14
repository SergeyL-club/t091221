import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { Services } from "../utils/models/Service";
import { IAccount } from "./interfaces";

// интерфейс input регистрации услуги
interface inputSetService{
  name: string
}

// функция проверки всех параметров input
const instanceOfISS = ( object: any ): object is inputSetService => {
  return "name" in object
}

// api регистрация услуги
const setService = async(account: IAccount, data: inputSetService | undefined) => {
  
  // проверки
  if(!account.role.isAdminFun && !account.role.isExecutorFun) {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data || !instanceOfISS(data)) {
    throw new ApiError(400, `Not enough input`)
  }
  if(await Services.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`)
  }

  // создание и сохранение услуги
  let newServiceDoc = await Services.create({
    name: data.name
  }).catch(e => {
    // если произошла ошибка
    if(e.code === 11000) throw new ApiError(403, `Duplicate name`)
    else logger.error(e)
  })

  // проврка услуги
  if(newServiceDoc) {
    return {
      newService: newServiceDoc
    }
  } else {
    throw new ApiError(403, `Registration service failed`)
  }
}

module.exports = {
  setService
}