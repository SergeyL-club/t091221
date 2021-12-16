import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { Classes } from "../utils/models/Class";
import { IAccount } from "./interfaces";

// интерфейс input регистрации роли
interface inputSetClass {
  char: string
  act: number 
}

// функция проверки всех параметров input
const instanceOfISC = ( object: any ): object is inputSetClass => {
  return "char" in object && "act" in object
}

// api регистрации класса
const setClass = async( account: IAccount, data: inputSetClass ) => {

  // проверки
  if(!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data || !instanceOfISC(data)) {
    throw new ApiError(400, `Not enough input`)
  }
  if(data.char.length > 1) {
    throw new ApiError(409, `Char length more 1`)
  }
  if(!(/[A-Z]/.test(data.char))) {
    throw new ApiError(409, `Char no letter`)
  }
  if(await Classes.findOne({ char: data.char, act: data.act })) {
    throw new ApiError(409, `This char and act is taken`)
  }

  // создание и сохранение класса
  let newClassDoc = await Classes.create({
    char: data.char,
    act: data.act
  }).catch(e => {
    // если произошла ошибка
    if(e.code === 11000) throw new ApiError(409, `Duplicate char or act`)
    else logger.error(e)
  })

  // проверка класса
  if(newClassDoc) {
    return { 
      newClass: newClassDoc
    }
  } else {
    throw new ApiError(409, `Registration class failed`)
  }
}

// api получения всех классов
const getAllClass = async( account: IAccount, data: undefined ) => {
  
  // запрос на все классы
  let allClass = await Classes.aggregate([
    {
      $match: {}
    },
    {
      $project: {
        __v: 0
      }
    }
  ])
  
  // возвращение ответа
  return { allClass }
}

// экспорт api функций
module.exports = {
  setClass,
  getAllClass
}