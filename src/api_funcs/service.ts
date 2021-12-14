import { ApiError } from "../utils/apiError"
import { logger } from "../utils/logger"
import { Services } from "../utils/models/Service"
import { TypeServices } from "../utils/models/TypeService"
import { IAccount } from "./interfaces"
import fs from 'fs'
import { IRole } from '../utils/models/Role'
import { resolve } from "path"
import { Prices } from "../utils/models/Price"
import { Users } from "../utils/models/User"

// интерфейс input регистрации услуги
interface inputSetService{
  name: string
  type: string
  prices: string
  images: Array<any>
  executors: string
}

// массив price
interface AEIPrice {
  currency: string
  cost: number
}

// функция проверки всех параметров input
const instanceOfISS = ( object: any ): object is inputSetService => {
  return "name" in object && "type" in object && "prices" in object
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
  
  
  // запись картинок
  let imageUrls : Array<any> = []
  let images
  if(data.images && !data.images.length) {
    images = [data.images]
  } else if(data.images) {
    images = data.images
  }
  if(images && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      
      // проверка правильности загрузки файлов
      let dataFile = fs.readFileSync(img.path)
      if(!dataFile) throw new ApiError(43, `No file`)

      // создание папки услуг
      fs.promises.mkdir(`${resolve(__dirname, "../../statics")}\\imgService\\${data.name}`, { recursive: true }).then(() => {

        // создание файла (картинки) в папке услуг
        fs.writeFileSync(`${resolve(__dirname, "../../statics")}\\imgService\\${data.name}\\${data.name+i}.png`, dataFile)
        
        // запись url в базу данных
        imageUrls.push(`/statics/imgService/${data.name}/${data.name+i}`)
      })
    }
  }

  // создание списка цен
  let priceIds = []
  let prices : Array<AEIPrice>  = JSON.parse(data.prices)
  if(data.prices.length > 0) {
    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      
      // создание и сохранение цены
      let newPrice = await Prices.create({
        currency: price.currency,
        cost: price.cost
      }).catch(e => {
        // если произошла ошибка
        if(e) return
      })
      
      // проверка создания
      if(newPrice) priceIds.push(newPrice._id) 
    }
  }

  //список исполнителей
  let executorIds = []
  let executors
  // проверка на наличие
  if(data.executors) {
    executors = JSON.parse(data.executors)
  }
  if(executors) {
    for (let i = 0; i < executors.length; i++) {
      const id = executors[i];
      
      // проверки
      let candidate = await Users.findOne({ _id: id }).populate<{role : IRole}>("role") 
      if(!candidate) return
      if(!candidate.role.isExecutorFun) return

      // запись id
      executorIds.push(candidate._id)
    }
  }

  // получение типа услуги
  let type = await TypeServices.findOne({ _id: data.type })
  if(!type) {
    throw new ApiError(409, `Type service undefined`)
  }
  
  // создание и сохранение услуги
  let newServiceDoc = await Services.create({
    name: data.name,
    type: type._id,
    prices: priceIds,
    images: imageUrls,
    executors: executorIds
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