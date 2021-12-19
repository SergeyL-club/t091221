import { ApiError } from "../utils/apiError";
import { Roles } from "../utils/models/Role";
import { Users } from "../utils/models/User";
import { generateToken } from "../utils/verifyToken";
import { hashSync, compareSync } from "bcrypt";
import { logger } from "../utils/logger";
import { Classes } from "../utils/models/Class";
import { Types } from "mongoose";

// интерфейс input регистрации
interface inputRegistration {
  nickname: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mail: string;
  classId?: string;
}

// функция проверки всех параметров input
const instanceOfIR = (object: any): object is inputRegistration => {
  return (
    "nickname" in object &&
    "password" in object &&
    "firstName" in object &&
    "middleName" in object &&
    "lastName" in object &&
    "mail" in object
  );
};

// api регистрации
const registration = async (account: undefined, data: inputRegistration) => {
  // проверка
  if (!data || !instanceOfIR(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (data.classId) {
    if (!(await Classes.findOne({ _id: data.classId }))) {
      throw new ApiError(409, `Class undefined`);
    }
  }

  // поиск стандартной роли
  let defRole = await Roles.findOne({
    isClientFun: true,
  });

  // проверка
  if (!defRole) {
    throw new ApiError(400, `No default roleId`);
  }

  // создание hash пароля
  let hashPassword = hashSync(data.password, 7);

  // создание и сохранение пользователя
  let newUser = await Users.create({
    nickname: data.nickname,
    passwordHash: hashPassword,
    classId: data.classId ? new Types.ObjectId(data.classId) : undefined,
    roleId: defRole._id,
    FIO: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
    },
    mail: data.mail,
  }).catch((e) => {
    // если произошла ошибка
    if (e.code === 11000) throw new ApiError(409, `Duplicate nickname`);
    else logger.error(e);
  });

  // проверка пользователя
  if (newUser) {
    let token = generateToken(newUser._id);

    return {
      token,
    };
  } else {
    throw new ApiError(409, `Registration failed`);
  }
};

// интерфейс input авторизации
interface inputAuthorization {
  nickname: string;
  password: string;
}

// функция проверки всех параметров input
const instanceOfIA = (object: any): object is inputAuthorization => {
  return "nickname" in object && "password" in object;
};

// api авторизации
const authorization = async (
  account: undefined,
  data: inputAuthorization | undefined
) => {
  // проверка
  if (!data || !instanceOfIA(data)) {
    throw new ApiError(400, `Not enough input`);
  }

  // поиск пользователя
  let user = await Users.findOne({ nickname: data.nickname });

  if (!user) {
    throw new ApiError(403, `nickname failed`);
  }

  // проверка пороля
  if (compareSync(data.password, user.passwordHash)) {
    let token = generateToken(user._id);

    return {
      token,
    };
  } else {
    throw new ApiError(403, `nickname failed`);
  }
};

// интерфейс input регистрации по коду
interface inputRegistrationByCode extends inputRegistration {
  registrationCode: string;
  roleId: string;
  classId?: string;
}

// функция проверки всех параметров input
const instanceOfIRBC = (object: any): object is inputRegistrationByCode => {
  return (
    instanceOfIR(object) && "registrationCode" in object && "roleId" in object
  );
};

// api регистрация по коду
const registrationByCode = async (
  account: undefined,
  data: inputRegistrationByCode
) => {
  // проверки
  if (!data || !instanceOfIRBC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (global.SECRET_KEY !== data.registrationCode) {
    throw new ApiError(403, `invalid secret key`);
  }
  if (data.classId) {
    if (!(await Classes.findOne({ _id: data.classId }))) {
      throw new ApiError(409, `Class undefined`);
    }
  }

  // поиск роли
  let role = await Roles.findOne({ _id: data.roleId });

  // проверка
  if (!role) {
    throw new ApiError(400, `No roleId`);
  }

  // создание hash пароля
  let hashPassword = hashSync(data.password, 7);

  // создание и сохранение пользователя
  let newUser = await Users.create({
    nickname: data.nickname,
    passwordHash: hashPassword,
    roleId: role._id,
    FIO: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
    },
    mail: data.mail,
    classId: data.classId ? new Types.ObjectId(data.classId) : null,
  }).catch((e) => {
    // если произошла ошибка
    if (e.code === 11000) throw new ApiError(409, `Duplicate nickname`);
    else logger.error(e);
  });

  // проверка пользователя
  if (newUser) {
    let token = generateToken(newUser._id);

    return {
      token,
    };
  } else {
    throw new ApiError(409, `Registration failed`);
  }
};

// экспорт api функций
module.exports = {
  registration,
  authorization,
  registrationByCode,
};
