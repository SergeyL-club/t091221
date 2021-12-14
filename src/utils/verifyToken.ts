import { ApiError } from "./apiError";
import { Roles } from "./models/Role";
import { Users } from "./models/User";

export const verify = async(req: any) => {
  if(!req.headers.token)
    throw new ApiError(403, "Token invalid")

  let token = req.headers.token
  let verify
  if(!(verify = await Users.findOne({ tokens: token }).populate({ path: "role", model: Roles }))) {
    throw ApiError.forbidden()
  }

  return verify
}