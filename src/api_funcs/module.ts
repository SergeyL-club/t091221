import { ApiError } from "../utils/apiError"
import { Modules } from "../utils/models/Module"
import { IAccount } from "./interfaces"
import { Types } from 'mongoose'
import { Questions } from "../utils/models/Question"
import { logger } from "../utils/logger"

// интерфейс input регистрации модуля
interface inputSetModule {
  name: string
  desc: string
  lvl: number
  childIds?: Array<string>
  questions?: Array<string>
}

// функция проверки всех параметров input
const instanceOfISM = ( object: any ): object is inputSetModule => {
  return "name" in object && "desc" in object && "lvl" in object
}

// api регисрации модуля
const setModule = async( account: IAccount, data: inputSetModule ) => {

  // проверки
  if(!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`) 
  }
  if(!data || !instanceOfISM(data)) {
    throw new ApiError(400, `Not enough input`)
  }

  // проверка заданий
  let questionIds = []
  if(data.questions) {
    for (let i = 0; i < data.questions.length; i++) {
      const question = data.questions[i];
      if(await Questions.findOne({ _id: new Types.ObjectId(question) })) {
        questionIds.push(new Types.ObjectId(question))
      }
    }
  }

  // проверка детей
  let childIds = []
  if(data.childIds) {
    for (let i = 0; i < data.childIds.length; i++) {
      const question = data.childIds[i];
      if(await Modules.findOne({ _id: new Types.ObjectId(question) })) {
        childIds.push(new Types.ObjectId(question))
      }
    }
  }

  // создание и сохранение модуля
  let newModuleDoc = await Modules.create({
    name: data.name,
    desc: data.desc,
    lvl: data.lvl,
    childId: (childIds.length > 0) ? childIds : undefined,
    questions: (questionIds.length > 0) ? questionIds : undefined,
  }).catch(e => {
    // если произошла ошибка
    if(e.code === 11000) throw new ApiError(409, `Duplicate module`)
    else logger.error(e)
  })

  // проверка модуля
  if(newModuleDoc) {
    return { 
      newRole: newModuleDoc
    }
  } else {
    throw new ApiError(409, `Registration module failed`)
  }
}

// api получение всех предметов
const getAllCharter = async (account: IAccount, data: undefined) => {
  
  // запрос на все предметы
  const modules = await Modules.aggregate([
    {
      $match: {
        lvl: 0
      }
    },
    {
      $project: {
        __v: 0
      }
    }
  ])

  // возвращение ответа
  return { modules }  
}

// интерфейс input получение всех детей (1 уровень)
interface inputGetChilds {
  parent: string
}

// функция проверки всех параметров input
const instanceOfIGC = ( object: any ): object is inputGetChilds => {
  return "parent" in object 
}

// api получение всех детей (1 уровень) по id родителя
const getAllChild = async (account: IAccount, data: inputGetChilds ) => {
  
  // проверки
  if(!data || !instanceOfIGC(data)) {
    throw new ApiError(400, `Not enough input`)
  } 
  if(!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`)
  }
  
  // запрос на всех детей (1 уровень)
  const moduleChilds = await Modules.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(data.parent)
      }
    },
    {
      $project: {
        __v: 0
      }
    },
    {
      $lookup: {
        from: Modules.modelName,
        localField: "childIds",
        foreignField: "_id",
        as: "childs"
      }
    },
    {
      $project: {
        childIds: 0
      }
    }
  ])

  // возвращение ответа
  return { module: moduleChilds }
}

// интерфейс input создание связи
interface inputConParentChilds {
  parent: string 
  child: string
}

// функция проверки всех параметров input
const instanceOfICPC = ( object: any ): object is inputConParentChilds => {
  return "parent" in object && "child" in object
}

// api создание связи
const setConParentChild = async (account: IAccount, data: inputConParentChilds ) => {

  // проверки
  if(!data || !instanceOfICPC(data)) {
    throw new ApiError(400, `Not enough input`)
  } 
  if(!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`)
  }
  if(!(await Modules.findOne({ _id: new Types.ObjectId(data.child) }))) {
    throw new ApiError(400, `Child module undefined`)
  }

  // обновление связи
  Modules.updateOne({ _id: new Types.ObjectId(data.parent) }, {
    $addToSet: {
      childIds: new Types.ObjectId(data.child)
    }
  }).catch(e => {
    // если неудача
    throw new ApiError(409, `${e}`)
  })
  return { Ok: true }
}

// api удаление связи
const remConParentChild = async (account: IAccount, data: inputConParentChilds ) => {

  // проверки
  if(!data || !instanceOfICPC(data)) {
    throw new ApiError(400, `Not enough input`)
  } 
  if(!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`)
  }
  if(!(await Modules.findOne({ _id: new Types.ObjectId(data.child) }))) {
    throw new ApiError(400, `Child module undefined`)
  }

  // обновление связи
  Modules.updateOne({ _id: new Types.ObjectId(data.parent) }, {
    $pull: {
      childIds: new Types.ObjectId(data.child)
    }
  }).catch(e => {
    // если неудача
    throw new ApiError(409, `${e}`)
  })
  return { Ok: true }
}

// экспорт api функций
module.exports = {
  setModule,
  getAllCharter,
  getAllChild,
  setConParentChild,
  remConParentChild
}