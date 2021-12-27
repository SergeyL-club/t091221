import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { Roles } from "../utils/models/Role";
import { Users } from "../utils/models/User";
import { IAccount } from "./interfaces";

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

const getAllRole = async (account: IAccount, data: undefined) => {
  // проверка
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }

  // запрос на все роли
  const roles = await Roles.aggregate([
    {
      $match: {},
    },
    {
      $project: {
        __v: 0,
      },
    },
  ]);

  // возвращение ответа
  return { roles };
};

// интерфейс input удаление роли
interface inputRemRole {
  roleId: string;
}

// функция проверки всех параметров input
const instanceOfIRR = (object: any): object is inputRemRole => {
  return "roleId" in object;
};

// api удаление роли
const remRole = async (account: IAccount, data: inputRemRole) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRR(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Roles.findOne({ _id: new Types.ObjectId(data.roleId) }))) {
    throw new ApiError(400, `Role undefined`);
  }

  // поиск пользователей и изменение их ролей на client
  let roleClient = await Roles.find({ isClientFun: true });
  if (roleClient.length === 1 && roleClient[0]._id.toString() === data.roleId) {
    throw new ApiError(400, `Role no delete, role default client`);
  }
  // если таких ролей больше 1
  else if (roleClient.length > 1) {
    roleClient = roleClient.filter(
      (item) => item._id.toString() !== data.roleId
    );
    // проверка на то что без роли будет другая роль с client fun
    if (roleClient.length > 0) {
      let defRole = roleClient[0];
      let candidates = await Users.find({
        roleId: new Types.ObjectId(data.roleId),
      });
      if (candidates.length > 0) {
        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i];
          await Users.updateOne(
            {
              _id: candidate._id,
            },
            {
              roleId: defRole._id,
            }
          );
        }
      }
    } else {
      throw new ApiError(400, `Role no delete, role default client`);
    }
  }
  // если это 1 роль и не равная с client fun role
  else if (
    roleClient.filter((item) => item._id.toString() !== data.roleId).length > 0
  ) {
    let defRole = roleClient.filter(
      (item) => item._id.toString() !== data.roleId
    )[0];
    let candidates = await Users.find({
      roleId: new Types.ObjectId(data.roleId),
    });
    if (candidates.length > 0) {
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        await Users.updateOne(
          {
            _id: candidate._id,
          },
          {
            roleId: defRole._id,
          }
        );
      }
    }
  }

  // удлаение
  let delRole = await Roles.findOne({ _id: new Types.ObjectId(data.roleId) });
  await Roles.remove({
    _id: new Types.ObjectId(data.roleId),
  });

  // возвращение ответа
  return { Ok: true, delete: true, delRole };
};

// экспорт api функций
module.exports = {
  setRole,
  remRole,
  getAllRole,
};
