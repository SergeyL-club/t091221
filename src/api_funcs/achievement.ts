import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Modules } from "../utils/models/Module";
import { IAccount } from "./interfaces";
import { ReadStream, promises } from "fs";
import { Achievements } from "../utils/models/Achievement";
import { resolve } from "path";

// интерфейс input регистрации роли
interface inputSetAchievement {
  name: string;
  desc: string;
  img: ReadStream;
  moduleIds?: string | Array<string>;
}

// функция проверки всех параметров input
const instanceOfISA = (object: any): object is inputSetAchievement => {
  return "name" in object && "desc" in object && "img" in object;
};

// api регистрации класса
const setAchievement = async (account: IAccount, data: inputSetAchievement) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (await Achievements.findOne({ name: data.name })) {
    throw new ApiError(
      409,
      `Achievement already registered with the same name`
    );
  }
  if (typeof data.moduleIds === "string") {
    data.moduleIds = JSON.parse(data.moduleIds);
  }

  // если есть список модулей
  let moduleIds = [];
  if (data.moduleIds) {
    for (let i = 0; i < data.moduleIds.length; i++) {
      const moduleId = data.moduleIds[i];
      if (await Modules.findOne({ _id: new Types.ObjectId(moduleId) })) {
        moduleIds.push(new Types.ObjectId(moduleId));
      }
    }
  }

  // создание статичной папки достижения и добавление картинки
  console.log(resolve(__dirname, "../../statics"));

  await promises.mkdir(
    resolve(__dirname, `../../statics/imgAchievements/${data.name}`),
    { recursive: true }
  );
  let dataImg = await promises.readFile(data.img.path);
  await promises.writeFile(
    resolve(__dirname, `../../statics/imgAchievements/${data.name}/img.png`),
    dataImg
  );

  // создание и сохранение достижения
  let newAchievementDoc = await Achievements.create({
    name: data.name,
    desc: data.desc,
    moduleIds,
    imgUrl: `/statics/imgAchievements/${data.name}/img.png`,
  });

  // возвращение созданного достижения
  return { newAchievement: newAchievementDoc };
};

// интерфейс input регистрации роли
interface inputRemAchievement {
  achievementId: string;
}

// функция проверки всех параметров input
const instanceOfIRA = (object: any): object is inputRemAchievement => {
  return "achievementId" in object;
};

// api удаление достижений
const remAchievement = async (account: IAccount, data: inputRemAchievement) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfIRA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (
    !(await Achievements.findOne({
      _id: new Types.ObjectId(data.achievementId),
    }))
  ) {
    throw new ApiError(400, `Achievement undefined`);
  }

  // удаление достижения
  let candidate = await Achievements.findOne({
    _id: new Types.ObjectId(data.achievementId),
  });
  if (candidate) {
    promises.rmdir(
      resolve(__dirname, `../../statics/imgAchievements/${candidate.name}`),
      { recursive: true }
    );
    await Achievements.remove({ _id: candidate._id });
    return { Ok: true, achievement: candidate };
  } else return { Ok: false };
};

// интерфейс input регистрации роли
interface inputToggleConAchievement {
  achievementId: string;
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfITCA = (object: any): object is inputToggleConAchievement => {
  return "achievementId" in object && "moduleId" in object;
};

//api добавления и удаление связей с модулем
const toggleConAchievement = async (
  account: IAccount,
  data: inputToggleConAchievement
) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfITCA(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.moduleId) }))) {
    throw new ApiError(400, `Module undefined`);
  }
  if (
    !(await Achievements.findOne({
      _id: new Types.ObjectId(data.achievementId),
    }))
  ) {
    throw new ApiError(400, `Achievement undefined`);
  }

  // toggle
  if (
    await Achievements.findOne({
      _id: new Types.ObjectId(data.achievementId),
      moduleIds: {
        $in: [new Types.ObjectId(data.moduleId)],
      },
    })
  ) {
    await Achievements.updateOne(
      { _id: new Types.ObjectId(data.achievementId) },
      {
        $pull: {
          moduleIds: new Types.ObjectId(data.moduleId),
        },
      }
    );
    return { Ok: true, remove: true };
  } else {
    await Achievements.updateOne(
      { _id: new Types.ObjectId(data.achievementId) },
      {
        $addToSet: {
          moduleIds: new Types.ObjectId(data.moduleId),
        },
      }
    );
    return { Ok: true, add: true };
  }
};

// экспорт api функций
module.exports = {
  setAchievement,
  remAchievement,
  toggleConAchievement,
};
