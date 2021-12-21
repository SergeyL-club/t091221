import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Achievements } from "../utils/models/Achievement";
import { AchievementAccounts } from "../utils/models/AchievementAccount";
import { Modules } from "../utils/models/Module";
import { IAccount } from "./interfaces";

// интерфейс input создания сообщения
interface inputGetAchievementModule {
  moduleId?: string;
}

// api получение всех достижений пользователя
const getAchievementModule = async (
  account: IAccount,
  data: inputGetAchievementModule
) => {
  // проверки
  if (!data) {
    data = {
      moduleId: undefined,
    };
  }

  // поиск
  let achievement;
  if (data.moduleId) {
    achievement = await AchievementAccounts.aggregate([
      {
        $match: {
          accountId: account._id,
          moduleId: new Types.ObjectId(data.moduleId),
        },
      },
      {
        $lookup: {
          from: Modules.modelName,
          localField: "moduleId",
          foreignField: "_id",
          as: "module",
        },
      },
      {
        $lookup: {
          from: Achievements.modelName,
          localField: "achievementIds",
          foreignField: "_id",
          as: "achievements",
        },
      },
    ]);
  } else {
    achievement = await AchievementAccounts.aggregate([
      {
        $match: {
          accountId: account._id,
          moduleId: null,
        },
      },
      {
        $lookup: {
          from: Achievements.modelName,
          localField: "achievementIds",
          foreignField: "_id",
          as: "achievements",
        },
      },
    ]);
  }

  // возвращение ответа
  return { achievement: achievement ? achievement[0] : {} };
};

// экспорт api функций
module.exports = {
  getAchievementModule,
};
