import { ApiError } from "../utils/apiError"
import { Roles } from "../utils/models/Role"
import { Users } from "../utils/models/User"
import { generateToken } from "../utils/verifyToken"
import { hashSync, compareSync } from 'bcrypt'
import { logger } from "../utils/logger"

interface inputRegistration{
  login: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  mail: string
  tel: string
}

const instanceOfIR = (object: any): object is inputRegistration => {
  return "login" in object && "password" in object 
    && "firstName" in object && "middleName" in object 
    && "lastName" in object && "mail" in object &&
    "tel" in object
 } 

const registration = async (account: undefined, data: inputRegistration ) => {
  
  // проверка
  if( !(data) || !(instanceOfIR(data)) ) {
    throw new ApiError(400, `Not enough input`)
  }

  // поиск стандартной роли
  let defRole = await Roles.findOne({ isExecutorFun: false, isClientFun: true, isAdminFun: false })

  // проверка
  if(!defRole) {
    throw new ApiError(400, `No default role`)
  }

  let hashPassword = hashSync(data.password, 7)

  // create and save user
  let newUser = await Users.create({
    login: data.login,
    password: hashPassword,
    role: defRole._id,
    FIO: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName
    },
    mail: data.mail,
    tel: data.tel
  }).catch(e => {
    if(e.code === 11000) throw new ApiError(409, `Duplicate nickname`)
    else logger.error(e)
  })

  if(newUser) {
    let token = generateToken(newUser._id)
  
    return {
      token
    }
  } else {
    throw new ApiError(409, `Registration failed`)
  }
}

interface inputAuthorization {
  login: string
  password: string
}
const instanceOfIA = (object: any): object is inputAuthorization => {
  return "login" in object && "password" in object 
 } 

const authorization = async ( account: undefined, data: inputAuthorization | undefined ) => {

  // проверка
  if( !(data) || !(instanceOfIA(data)) ) {
    throw new ApiError(400, `Not enough input`)
  }

  let user = await Users.findOne({ login: data.login })

  if(!user) {
    throw new ApiError(403, `Login failed`)
  }

  if(compareSync(data.password, user.password)) {
    let token = generateToken(user._id)
  
    return {
      token
    }
  } else {
    throw new ApiError(403, `Login failed`)
  }
}

module.exports = {
  registration,
  authorization
}