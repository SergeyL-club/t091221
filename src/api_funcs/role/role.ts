import { ApiError } from "../../utils/apiError";
import { logger } from "../../utils/logger";
import { Roles } from "../../utils/models/Role";
import { IAccount } from "../interfaces";

// интерфейс input регистрации роли
interface inputSetRole {
  name: string;
  isAdminFun?: boolean;
  isClientFun?: boolean;
}

// функция проверки всех параметров input
const instanceOfISR = (object: any): object is inputSetRole => {
  return "name" in object;
};

// api регистрация роли
const setRole = async (account: IAccount, data: inputSetRole | undefined) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISR(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (await Roles.findOne({ name: data.name })) {
    throw new ApiError(409, `This name is taken`);
  }

  // создание и сохранение роли
  let newRoleDoc = await Roles.create({
    name: data.name,
    isAdminFun: data.isAdminFun ? data.isAdminFun : false,
    isClientFun: data.isClientFun ? data.isClientFun : false,
  }).catch((e) => {
    // если произошла ошибка
    if (e.code === 11000) throw new ApiError(409, `Duplicate name`);
    else logger.error(e);
  });

  // проверка типа услуги
  if (newRoleDoc) {
    return {
      newRole: newRoleDoc,
    };
  } else {
    throw new ApiError(409, `Registration role failed`);
  }
};

// экспорт api функций
module.exports = {
  setRole,
};
