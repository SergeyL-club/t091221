import mongoose, { Schema } from "mongoose"
import { ApiError } from "./apiError"
import { IRole, Roles } from "./models/Role"
import { Users } from "./models/User"
import jwt from 'jsonwebtoken'
import { Classes } from "./models/Class"

export const verify = async(req: any) => {
  if(!req.headers.token)
    throw new ApiError(403, "Token invalid")

  let token = req.headers.token
  await jwt.verify(token, global.SECRET_KEY, { algorithms: ["HS512"] }, (e, data) => {
    if(e) throw new ApiError(403, `${e.message}`)
    else token = data
  })

  let verify
  if(!(verify = await Users.aggregate([ 
    { 
      $match: { 
        "_id": new mongoose.Types.ObjectId(token.userId) 
      }  
    },
    {
      $lookup: {
        from: Roles.modelName,
        localField: "roleId",
        foreignField: "_id",
        as: "role"
      }
    },
    {
      $lookup: {
        from: Classes.modelName,
        localField: "classId",
        foreignField: "_id",
        as: "class"
      }
    },
    {
      $project: {
        _id: 0,
        nickname: 1,
        "FIO.firstName": 1,
        "FIO.middleName": 1,
        "FIO.lastName": 1,
        mail: 1,
        money: 1,
        likeMoney: 1,
        "class.char": 1,
        "class.act": 1,
        role: { "$arrayElemAt": [ "$role", 0 ] } 
      }
    },
    {
      $project: {
        "role._id": 0
      }
    }, 
    {
      $limit: 1
    }
  ]))) {
    throw ApiError.forbidden()
  }
  
  return verify[0]
}

export const generateToken = (userId: Schema.Types.ObjectId) => {
  let payload = {
    userId
  }
  return jwt.sign(payload, global.SECRET_KEY, {
    expiresIn: "24h",
    algorithm: "HS512"
  })
}