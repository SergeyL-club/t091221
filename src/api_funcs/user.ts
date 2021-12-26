import { ApiError } from "../utils/apiError";
import { Roles } from "../utils/models/Role";
import { Users } from "../utils/models/User";
import { generateToken } from "../utils/verifyToken";
import { hashSync, compareSync } from "bcrypt";
import { logger } from "../utils/logger";
import { Classes } from "../utils/models/Class";
import { Types } from "mongoose";
import { IAccount } from "./interfaces";

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
    throw new ApiError(403, `password failed`);
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

// админское удаление пользователя
// интерфейс input авторизации
interface inputAdminRemUser {
  userId: string;
}

// функция проверки всех параметров input
const instanceOfIARU = (object: any): object is inputAdminRemUser => {
  return "userId" in object;
};

// api удаление пользователя админом
const adminRemUser = async (account: IAccount, data: inputAdminRemUser) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIARU(data)) {
    throw new ApiError(400, `Not enough input`);
  }

  // удаление
  let candidate = await Users.findOne({ _id: new Types.ObjectId(data.userId) });
  if (candidate) candidate.deleteOne();

  // возвращение ответа
  return { Ok: true, delete: true, candidate };
};

// api удаление пользователя
const remUser = async (account: IAccount, data: undefined) => {
  // удаление
  let candidate = await Users.findOne({ _id: account._id });
  if (candidate) candidate.deleteOne();

  // возвращение ответа
  return { Ok: true, delete: true, candidate };
};

// api verify токена
const verifyToken = async (account: IAccount, data: undefined) => {
  return { account };
};

// интерфейс input изменения параметров пользователя
interface inputSetParamUser {
  nickname?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  mail?: string;
  classId?: Types.ObjectId;
}

// интерфейс проверок
interface IParam {
  nickname?: boolean;
  firstName?: boolean;
  middleName?: boolean;
  lastName?: boolean;
  mail?: boolean;
  class?: boolean;
}

// api изменение данных
const setParamUser = async (account: IAccount, data: inputSetParamUser) => {
  // проверки
  if (!data) {
    throw new ApiError(400, `Not enough input`);
  }
  let candidate;
  if (!(candidate = await Users.findOne({ _id: account._id }))) {
    throw new ApiError(400, `No user`);
  }

  let param: IParam = {
    nickname: false,
    firstName: false,
    middleName: false,
    lastName: false,
    mail: false,
    class: false
  };
  if (data.nickname) {
    candidate.nickname = data.nickname;
    param.nickname = true;
  }
  if (data.firstName) {
    candidate.FIO.firstName = data.firstName;
    param.firstName = true;
  }
  if (data.middleName) {
    candidate.FIO.middleName = data.middleName;
    param.middleName = true;
  }
  if (data.lastName) {
    candidate.FIO.lastName = data.lastName;
    param.lastName = true;
  }
  if (data.mail) {
    candidate.mail = data.mail;
    param.mail = true;
  }
  if (data.classId && await Classes.findOne({ _id: new Types.ObjectId(data.classId) })) {
    candidate.classId = new Types.ObjectId(data.classId);
    param.class = true;
  } else if (typeof data.classId !== "undefined") {
    candidate.classId = undefined;
    param.class = true;
  }

  // сохранение
  if (await candidate.save()) {
    return { Ok: true, param }
  } else return { Ok: false }

}

// интерфейс input изменение пароля
interface inputSetPassword {
  oldPassword: string;
  newPassword: string;
}

// функция проверки всех параметров input
const instanceOfISP = (object: any): object is inputSetPassword => {
  return (
    "oldPassword" in object &&
    "newPassword" in object
  );
};

// api изменение пароля
const setPassword = async (account: IAccount, data: inputSetPassword) => {
  // проверки
  if (!data || !instanceOfISP(data)) {
    throw new ApiError(400, `Not enough input`);
  }

  // пользователь
  let candidate = await Users.findOne({ _id: account._id });
  if (candidate) {
    if (compareSync(data.oldPassword, candidate.passwordHash)) {
      // создание hash пароля
      let hashPassword = hashSync(data.newPassword, 7);
      candidate.passwordHash = hashPassword;

      // сохранение
      if (await candidate.save()) {
        return { Ok: true, setNewPassword: true }
      } else return { Ok: false }
    } else throw new ApiError(409, `No verify old password`);
  }

}

// экспорт api функций
module.exports = {
  registration,
  authorization,
  adminRemUser,
  setParamUser,
  setPassword,
  remUser,
  verifyToken,
  registrationByCode,
};
