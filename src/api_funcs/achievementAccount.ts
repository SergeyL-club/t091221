import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Achievements } from "../utils/models/Achievement";
import { AchievementAccounts } from "../utils/models/AchievementAccount";
import { Modules, ModuleType } from "../utils/models/Module";
import { Users } from "../utils/models/User";
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

const getAchievementAccount = async (
  account: IAccount,
  data: inputGetAchievementModule
) => {
  if (!data) {
    data = { moduleId: undefined };
  }

  let allAchievementsAccount;

  if (data.moduleId) {
    allAchievementsAccount = await AchievementAccounts.aggregate([
      {
        $match: {
          accountId: account._id,
          moduleId: new Types.ObjectId(data.moduleId),
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
      {
        $lookup: {
          from: Modules.modelName,
          localField: "moduleId",
          foreignField: "_id",
          as: "module",
        },
      },
      {
        $project: {
          moduleId: 0,
          achievementIds: 0,
          _id: 0,
        },
      },
      {
        $project: {
          module: { $arrayElemAt: ["$module", 0] },
          achievements: 1,
        },
      },
      {
        $project: {
          "module.name": 1,
          "module._id": 1,
          "module.desc": 1,
          achievements: 1,
        },
      },
    ]);
  } else {
    allAchievementsAccount = await AchievementAccounts.aggregate([
      {
        $match: {
          accountId: account._id,
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
      {
        $lookup: {
          from: Modules.modelName,
          localField: "moduleId",
          foreignField: "_id",
          as: "module",
        },
      },
      {
        $project: {
          moduleId: 0,
          achievementIds: 0,
          _id: 0,
        },
      },
      {
        $project: {
          module: { $arrayElemAt: ["$module", 0] },
          achievements: 1,
        },
      },
      {
        $project: {
          "module.name": 1,
          "module._id": 1,
          "module.desc": 1,
          achievements: 1,
        },
      },
    ]);
  }

  return allAchievementsAccount;
};

interface inputSetAchievement {
  achievementId: string;
  accountId: string;
}

const setAchievementAccount = async (
  account: IAccount,
  data: inputSetAchievement
) => {
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (
    !data.accountId ||
    !(await Users.findOne({ _id: new Types.ObjectId(data.accountId) }))
  ) {
    throw new ApiError(400, "account undefined");
  }
  if (
    !data.achievementId ||
    !(await Achievements.findOne({
      _id: new Types.ObjectId(data.achievementId),
    }))
  ) {
    throw new ApiError(400, "achievement undefined");
  }

  let achievementCandidate = await Achievements.findOne({
    _id: new Types.ObjectId(data.achievementId),
  });

  if (achievementCandidate) {
    if (
      !achievementCandidate.moduleIds ||
      (achievementCandidate.moduleIds &&
        achievementCandidate.moduleIds.length === 0)
    ) {
      let candidate = await AchievementAccounts.findOne({
        accountId: new Types.ObjectId(data.accountId),
        moduleId: undefined,
      });
      if (candidate) {
        candidate.achievementIds.push(achievementCandidate._id);
        await candidate.save();
        return { status: 200, block: candidate };
      }
    } else {
      achievementCandidate.moduleIds.forEach(async (moduleId) => {
        let candidate = await AchievementAccounts.findOne({
          accountId: new Types.ObjectId(data.accountId),
          moduleId: moduleId,
        });
        if (candidate && achievementCandidate) {
          candidate.achievementIds.push(achievementCandidate._id);
          await candidate.save();
        } else if(achievementCandidate) {
          let block = await AchievementAccounts.create({
            accountId: new Types.ObjectId(data.accountId),
            moduleId: moduleId,
            achievementIds: []
          });

          block.achievementIds.push(achievementCandidate._id);
          await block.save();
        }
      });
      return { status: 200 };
    }
  }
  throw new ApiError(409, "Error connect achievement in account");
};

// экспорт api функций
module.exports = {
  getAchievementModule,
  getAchievementAccount,
  setAchievementAccount,
};
