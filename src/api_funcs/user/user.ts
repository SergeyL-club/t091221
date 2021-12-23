import { ApiError } from "../../utils/apiError";
import { Roles } from "../../utils/models/Role";
import { Users } from "../../utils/models/User";
import { generateToken } from "../../utils/verifyToken";
import { hashSync, compareSync } from "bcrypt";
import { logger } from "../../utils/logger";

// интерфейс input регистрации
interface inputRegistration {
  nickname: string;
  passwordHash: string;
  firstName: string;
  middleName: string;
  lastName: string;
  mail: string;
}

// функция проверки всех параметров input
const instanceOfIR = (object: any): object is inputRegistration => {
  return (
    "nickname" in object &&
    "passwordHash" in object &&
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

  // поиск стандартной роли
  let defRole = await Roles.findOne({
    isExecutorFun: false,
    isClientFun: true,
    isAdminFun: false,
  });

  // проверка
  if (!defRole) {
    throw new ApiError(400, `No default role`);
  }

  // создание hash пароля
  let hashPassword = hashSync(data.passwordHash, 7);

  // создание и сохранение пользователя
  let newUser = await Users.create({
    nickname: data.nickname,
    password: hashPassword,
    role: defRole._id,
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
  passwordHash: string;
}

// функция проверки всех параметров input
const instanceOfIA = (object: any): object is inputAuthorization => {
  return "nickname" in object && "passwordHash" in object;
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
  if (compareSync(data.passwordHash, user.passwordHash)) {
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
  roleName: string;
}

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

  // поиск роли
  let role = await Roles.findOne({ name: data.roleName });

  // проверка
  if (!role) {
    throw new ApiError(400, `No role`);
  }

  // создание hash пароля
  let hashPassword = hashSync(data.passwordHash, 7);

  // создание и сохранение пользователя
  let newUser = await Users.create({
    nickname: data.nickname,
    password: hashPassword,
    role: role._id,
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

// функция проверки всех параметров input
const instanceOfIRBC = (object: any): object is inputRegistrationByCode => {
  return (
    instanceOfIR(object) && "registrationCode" in object && "roleName" in object
  );
};

// экспорт api функций
module.exports = {
  registration,
  authorization,
  registrationByCode,
};
