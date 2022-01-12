import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { logger } from "../utils/logger";
import { Classes } from "../utils/models/Class";
import { Modules } from "../utils/models/Module";
import { Users } from "../utils/models/User";
import { IAccount } from "./interfaces";

// интерфейс input регистрации роли
interface inputSetClass {
  char: string;
  act: number;
}

// функция проверки всех параметров input
const instanceOfISC = (object: any): object is inputSetClass => {
  return "char" in object && "act" in object;
};

// api регистрации класса
const setClass = async (account: IAccount, data: inputSetClass) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (data.char.length > 1) {
    throw new ApiError(409, `Char length more 1`);
  }
  if (!/[A-Z]|[a-z]|[а-я]|[А-Я]/.test(data.char)) {
    throw new ApiError(409, `Char no letter`);
  }
  if (await Classes.findOne({ char: data.char, act: data.act })) {
    throw new ApiError(409, `This char and act is taken`);
  }

  // создание и сохранение класса
  let newClassDoc = await Classes.create({
    char: data.char,
    act: data.act,
  }).catch((e) => {
    // если произошла ошибка
    if (e.code === 11000) throw new ApiError(409, `Duplicate char or act`);
    else logger.error(e);
  });

  // проверка класса
  if (newClassDoc) {
    return {
      newClass: newClassDoc,
    };
  } else {
    throw new ApiError(409, `Registration class failed`);
  }
};

// api получения всех классов
const getAllClass = async (account: IAccount, data: undefined) => {
  // запрос на все классы
  const allClass = await Classes.aggregate([
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
  return { allClass };
};

// интерфейс input удаление роли
interface inputRemClass {
  classId: string;
}

// функция проверки всех параметров input
const instanceOfIRC = (object: any): object is inputRemClass => {
  return "classId" in object;
};

// api регистрации класса
const remClass = async (account: IAccount, data: inputRemClass) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Classes.findOne({ _id: new Types.ObjectId(data.classId) }))) {
    throw new ApiError(400, `Class undefined`);
  }

  // удаление связей аккаунтов с классом
  let candidates = await Users.find({
    classId: new Types.ObjectId(data.classId),
  });
  console.log(candidates);
  if (candidates.length > 0) {
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      await Users.updateOne(
        {
          _id: candidate._id,
        },
        {
          $unset: {
            classId: 1,
          },
        }
      );
    }
  }

  // удаление класса
  let delClass = await Classes.findOne({
    _id: new Types.ObjectId(data.classId),
  });
  await Classes.remove({
    _id: new Types.ObjectId(data.classId),
  });

  // возвращение ответа
  return { Ok: true, delete: true, delClass };
};

interface inputGetAllUserClass {
  classId: string;
}

// функция проверки всех параметров input
const instanceOfIGAUC = (object: any): object is inputGetAllUserClass => {
  return "classId" in object;
};

// api регистрации класса
const getUsersClass = async (account: IAccount, data: inputGetAllUserClass) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIGAUC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Classes.findOne({ _id: new Types.ObjectId(data.classId) }))) {
    throw new ApiError(400, `Class undefined`);
  }

  // поиск
  let users = await Users.aggregate([
    {
      $match: {
        classId: new Types.ObjectId(data.classId),
      },
    },
  ]);

  // возвращение ответа
  return { users };
};

// интерфейс input удаление запрета на модуль
interface inputRemWNA {
  classId: string;
  moduleIds: string | Array<string>;
}

// функция проверки всех параметров input
const instanceOfIRWNA = (object: any): object is inputRemWNA => {
  return "classId" in object && "moduleIds" in object;
};

// api регистрации класса
const remWNA = async (account: IAccount, data: inputRemClass) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRWNA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Classes.findOne({ _id: new Types.ObjectId(data.classId) }))) {
    throw new ApiError(400, `Class undefined`);
  }
  if (typeof data.moduleIds === "string") {
    try {
      data.moduleIds = JSON.parse(data.moduleIds);
    } catch (e) {
      throw new ApiError(409, `Error convert string array moduleIds`);
    }
  }

  // список пользователей класса
  const accountsClass = await Users.find({
    classId: new Types.ObjectId(data.classId),
  });
  let accountIdsClass: Array<Types.ObjectId> = [];
  for (let i = 0; i < accountsClass.length; i++) {
    const account = accountsClass[i];
    accountIdsClass.push(account._id);
  }

  //  удаление запрета
  const modulesUndefined = [];
  for (let i = 0; i < data.moduleIds.length; i++) {
    const moduleId = data.moduleIds[i];

    const candidateModule = await Modules.findOne({
      _id: new Types.ObjectId(moduleId),
    });
    if (!candidateModule) {
      modulesUndefined.push(candidateModule);
      continue;
    }

    await candidateModule.update({
      $pullAll: {
        accountWNA: accountIdsClass,
      },
    });
  }

  return {
    Ok: true,
    modulesUndefined,
    accountIdsClass,
  };
};

// интерфейс input удаление запрета на модуль
interface inputSetWNA {
  classId: string;
  moduleIds: string | Array<string>;
}

// функция проверки всех параметров input
const instanceOfISWNA = (object: any): object is inputSetWNA => {
  return "classId" in object && "moduleIds" in object;
};

// api регистрации класса
const setWNA = async (account: IAccount, data: inputRemClass) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRWNA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Classes.findOne({ _id: new Types.ObjectId(data.classId) }))) {
    throw new ApiError(400, `Class undefined`);
  }
  if (typeof data.moduleIds === "string") {
    try {
      data.moduleIds = JSON.parse(data.moduleIds);
    } catch (e) {
      throw new ApiError(409, `Error convert string array moduleIds`);
    }
  }

  // список пользователей класса
  const accountsClass = await Users.find({
    classId: new Types.ObjectId(data.classId),
  });
  let accountIdsClass: Array<Types.ObjectId> = [];
  for (let i = 0; i < accountsClass.length; i++) {
    const account = accountsClass[i];
    accountIdsClass.push(account._id);
  }

  //  удаление запрета
  const modulesUndefined = [];
  for (let i = 0; i < data.moduleIds.length; i++) {
    const moduleId = data.moduleIds[i];

    const candidateModule = await Modules.findOne({
      _id: new Types.ObjectId(moduleId),
    });
    if (!candidateModule) {
      modulesUndefined.push(candidateModule);
      continue;
    }

    await candidateModule.update({
      $addToSet: {
        accountWNA: accountIdsClass,
      },
    });
  }

  return {
    Ok: true,
    modulesUndefined,
    accountIdsClass,
  };
};

// экспорт api функций
module.exports = {
  setClass,
  remClass,
  getUsersClass,
  getAllClass,
  remWNA,
  setWNA,
};
