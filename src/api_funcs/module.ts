import { ApiError } from "../utils/apiError";
import { Modules } from "../utils/models/Module";
import { IAccount } from "./interfaces";
import { Types } from "mongoose";
import { Questions } from "../utils/models/Question";
import { logger } from "../utils/logger";
import { Users } from "../utils/models/User";

// интерфейс input регистрации модуля
interface inputSetModule {
  name: string;
  desc: string;
  lvl?: number;
  accountWNA?: string | Array<string>;
  childIds?: string | Array<string>;
  questionIds?: string | Array<string>;
}

// функция проверки всех параметров input
const instanceOfISM = (object: any): object is inputSetModule => {
  return "name" in object && "desc" in object;
};

// api регисрации модуля
const setModule = async (account: IAccount, data: inputSetModule) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISM(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (typeof data.accountWNA === "string") {
    data.accountWNA = JSON.parse(data.accountWNA);
  }
  if (typeof data.childIds === "string") {
    data.childIds = JSON.parse(data.childIds);
  }
  if (typeof data.questionIds === "string") {
    data.questionIds = JSON.parse(data.questionIds);
  }
  if (!data.lvl) {
    data.lvl = -1;
  }

  // проверка заданий
  let questionIds = [];
  if (data.questionIds) {
    for (let i = 0; i < data.questionIds.length; i++) {
      const question = data.questionIds[i];
      if (await Questions.findOne({ _id: new Types.ObjectId(question) })) {
        questionIds.push(new Types.ObjectId(question));
      }
    }
  }

  // проверка детей
  let childIds = [];
  if (data.childIds) {
    for (let i = 0; i < data.childIds.length; i++) {
      const question = data.childIds[i];
      if (await Modules.findOne({ _id: new Types.ObjectId(question) })) {
        childIds.push(new Types.ObjectId(question));
      }
    }
  }

  // проверка связей запрета пользователей
  let accountIds = [];
  if (data.accountWNA) {
    for (let i = 0; i < data.accountWNA.length; i++) {
      const accountId = data.accountWNA[i];
      let candidate;
      if (
        (candidate = await Users.findOne({
          _id: new Types.ObjectId(accountId),
        }))
      ) {
        accountIds.push(candidate._id);
      }
    }
  }

  // создание и сохранение модуля
  let newModuleDoc = await Modules.create({
    name: data.name,
    desc: data.desc,
    lvl: data.lvl,
    childIds: childIds.length > 0 ? childIds : undefined,
    questionIds: questionIds.length > 0 ? questionIds : undefined,
    accountWNA: accountIds.length > 0 ? accountIds : undefined,
  }).catch((e) => {
    // если произошла ошибка
    console.log(e);
    if (e.code === 11000) throw new ApiError(409, `Duplicate module`);
    else logger.error(e);
  });

  // проверка модуля
  if (newModuleDoc) {
    return {
      newRole: newModuleDoc,
    };
  } else {
    throw new ApiError(409, `Registration module failed`);
  }
};

// api получение всех предметов
const getAllCharter = async (account: IAccount, data: undefined) => {
  // запрос на все предметы
  const modules = await Modules.aggregate([
    {
      $match: {
        lvl: 0,
      },
    },
    {
      $project: {
        __v: 0,
      },
    },
  ]);

  // возвращение ответа
  return { modules };
};

// интерфейс input получение всех детей (1 уровень)
interface inputGetChilds {
  parent: string;
}

// функция проверки всех параметров input
const instanceOfIGC = (object: any): object is inputGetChilds => {
  return "parent" in object;
};

// api получение всех детей (1 уровень) по id родителя
const getAllChild = async (account: IAccount, data: inputGetChilds) => {
  // проверки
  if (!data || !instanceOfIGC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`);
  }

  // запрос на всех детей (1 уровень)
  const moduleChilds = await Modules.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(data.parent),
      },
    },
    {
      $project: {
        __v: 0,
      },
    },
    {
      $lookup: {
        from: Modules.modelName,
        localField: "childIds",
        foreignField: "_id",
        as: "childs",
      },
    },
    {
      $project: {
        childIds: 0,
      },
    },
  ]);

  // возвращение ответа
  return { module: moduleChilds };
};

// интерфейс input создание связи
interface inputConParentChilds {
  parent: string;
  child: string;
}

// функция проверки всех параметров input
const instanceOfICPC = (object: any): object is inputConParentChilds => {
  return "parent" in object && "child" in object;
};

// api создание связи
const setConParentChild = async (
  account: IAccount,
  data: inputConParentChilds
) => {
  // проверки
  if (!data || !instanceOfICPC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.child) }))) {
    throw new ApiError(400, `Child module undefined`);
  }

  let parent = await Modules.findOne({ _id: new Types.ObjectId(data.parent) });

  // обновление связи
  if (parent) {
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.parent) },
      {
        $addToSet: {
          childIds: new Types.ObjectId(data.child),
        },
      }
    ).catch((e) => {
      // если неудача
      throw new ApiError(409, `${e}`);
    });
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.child) },
      {
        lvl: parent.lvl + 1,
      }
    );
    return { Ok: true };
  } else return { Ok: false };
};

// api удаление связи
const remConParentChild = async (
  account: IAccount,
  data: inputConParentChilds
) => {
  // проверки
  if (!data || !instanceOfICPC(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.parent) }))) {
    throw new ApiError(400, `Parent module undefined`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.child) }))) {
    throw new ApiError(400, `Child module undefined`);
  }

  let parent = await Modules.findOne({ _id: new Types.ObjectId(data.parent) });

  // обновление связи
  if (parent) {
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.parent) },
      {
        $pull: {
          childIds: new Types.ObjectId(data.child),
        },
      }
    ).catch((e) => {
      // если неудача
      throw new ApiError(409, `${e}`);
    });
    await Modules.updateOne(
      { _id: new Types.ObjectId(data.child) },
      {
        lvl: -1,
      }
    );
    return { Ok: true };
  } else return { Ok: false };
};

// интерфейс input создание связи запрета к модулю
interface inputConAccountWNA {
  accountId?: string;
  accountIds?: string | Array<string>;
  moduleId?: string;
  moduleIds?: string | Array<string>;
}

// функция проверки всех параметров input
const instanceOfIAWNA = (object: any): object is inputConAccountWNA => {
  return (
    ("accountId" in object || "accountIds" in object) &&
    ("moduleId" in object || "moduleIds" in object)
  );
};

// api регистрации связи запрета к модулю
const setConAccountWN = async (account: IAccount, data: inputConAccountWNA) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIAWNA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (data.accountIds && data.accountId) {
    throw new ApiError(409, `Account id or account ids`);
  }
  if (data.moduleId && data.moduleIds) {
    throw new ApiError(409, `Module id or module ids`);
  }
  if (typeof data.accountIds === "string") {
    data.accountIds = JSON.parse(data.accountIds);
  }
  if (typeof data.moduleIds === "string") {
    data.moduleIds = JSON.parse(data.moduleIds);
  }

  // проверка пользователей
  if (data.moduleId) {
    // если moduleId
    let candidate = await Modules.findOne({
      _id: new Types.ObjectId(data.moduleId),
    });
    if (candidate) {
      // если есть такой модуль
      if (data.accountId) {
        // добавит если есть такой
        if (await Users.findOne({ _id: new Types.ObjectId(data.accountId) })) {
          await Modules.updateOne(
            { _id: candidate._id },
            {
              $addToSet: {
                accountWNA: new Types.ObjectId(data.accountId),
              },
            }
          );
        }
      } else if (data.accountIds) {
        for (let i = 0; i < data.accountIds.length; i++) {
          const accountId = data.accountIds[i];
          // добавит если есть такой
          if (await Users.findOne({ _id: new Types.ObjectId(accountId) })) {
            await Modules.updateOne(
              { _id: candidate._id },
              {
                $addToSet: {
                  accountWNA: new Types.ObjectId(accountId),
                },
              }
            );
          }
        }
      }
    } else {
      throw new ApiError(400, `Module undefined`);
    }
  } else if (data.moduleIds) {
    // если modules
    for (let i = 0; i < data.moduleIds.length; i++) {
      const moduleId = data.moduleIds[i];
      let candidate = await Modules.findOne({
        _id: new Types.ObjectId(moduleId),
      });
      if (candidate) {
        // если есть модуль
        if (data.accountId) {
          // если есть то добавит
          if (
            await Users.findOne({ _id: new Types.ObjectId(data.accountId) })
          ) {
            await Modules.updateOne(
              { _id: candidate._id },
              {
                $addToSet: {
                  accountWNA: new Types.ObjectId(data.accountId),
                },
              }
            );
          }
        } else if (data.accountIds) {
          for (let y = 0; y < data.accountIds.length; y++) {
            const accountId = data.accountIds[y];
            // если есть то добавит
            if (await Users.findOne({ _id: new Types.ObjectId(accountId) })) {
              await Modules.updateOne(
                { _id: candidate._id },
                {
                  $addToSet: {
                    accountWNA: new Types.ObjectId(accountId),
                  },
                }
              );
            }
          }
        }
      } else {
        throw new ApiError(400, `Modules undefined`);
      }
    }
  }
  return {
    Ok: true,
  };
};

// api добавить все задачи в модуль
const setQuestionsModule = async (account: IAccount, data: undefined) => {};

// экспорт api функций
module.exports = {
  setModule,
  getAllCharter,
  getAllChild,
  setConParentChild,
  remConParentChild,
  setConAccountWN,
  setQuestionsModule,
};
