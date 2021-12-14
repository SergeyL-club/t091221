import { Schema } from "mongoose"
import { ApiError } from "./apiError"
import { Roles } from "./models/Role"
import { Users } from "./models/User"
import jwt from 'jsonwebtoken'

export const verify = async(req: any) => {
  if(!req.headers.token)
    throw new ApiError(403, "Token invalid")

  let token = req.headers.token
  await jwt.verify(token, global.SECRET_KEY, { algorithms: ["HS512"] }, (e, data) => {
    if(e) throw new ApiError(403, `${e.message}`)
    else token = data
  })

  let verify
  if(!(verify = await Users.findOne({ _id: token.userId }).populate({ path: "role", model: Roles }))) {
    throw ApiError.forbidden()
  }

  return verify
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