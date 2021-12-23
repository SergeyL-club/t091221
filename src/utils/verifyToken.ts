import { Schema } from "mongoose";
import { ApiError } from "./apiError";
import { Roles } from "./models/Role";
import { Accounts } from "./models/Account";
import jwt from "jsonwebtoken";

/**
 *  verify token
 * @param req - request http
 * @returns api error (func apiError.ts) or data account
 */

export const verify = async (req: any) => {
  if (!req.headers.token) throw new ApiError(403, "Token invalid");

  let token = req.headers.token;
  await jwt.verify(
    token,
    global.SECRET_KEY,
    { algorithms: ["HS512"] },
    (e, data) => {
      if (e) throw new ApiError(403, `${e.message}`);
      else token = data;
    }
  );

  let verify;
  if (
    !(verify = await Accounts.findOne({ _id: token.userId }).populate({
      path: "role",
      model: Roles,
    }))
  ) {
    throw ApiError.forbidden();
  }

  return verify;
};
/**
 * generate token
 * @param accountId - account id (type ObjectId)
 * @returns token (valid 24h)
 */
export const generateToken = (accountId: Schema.Types.ObjectId) => {
  let payload = {
    accountId,
  };
  return jwt.sign(payload, global.SECRET_KEY, {
    expiresIn: "24h",
    algorithm: "HS512",
  });
};
