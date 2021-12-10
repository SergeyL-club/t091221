import { ApiError } from "../utils/apiError"

const send = async (req: any, data: any) => {

  if(!data.test) {
    throw new ApiError(400,`test`)
  }

  return {
    test: "test"
  }
}

module.exports = {
  send
}