import { ApiError } from "../utils/apiError"
import { Users } from "../utils/models/User"

const send = async (req: any, data: any) => {

  if(!data.test) {
    throw new ApiError(400,`test`)
  }

  let users = await Users.find({})

  return {
    test: "test",
    users
  }
}

module.exports = {
  send
}