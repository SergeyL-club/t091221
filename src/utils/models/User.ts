import { model, Schema, Model, Document, Types } from "mongoose";
import { AchievementAccounts } from "./AchievementAccount";
import { EModels } from "./enumModels";
import { Modules } from "./Module";

// глобальные константы
type ObjectId = Schema.Types.ObjectId;
const ObjectId = Schema.Types.ObjectId;

// интерфейс user
export interface IUser {
  nickname: string;
  passwordHash: string;
  roleId: Types.ObjectId;
  FIO: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
  mail: string;
  money: number;
  likeMoney: number;
  classId: Types.ObjectId | undefined;
}

// расширенный тип
interface UserType extends IUser, Document {}

// интерфейс модели
interface UserModel extends Model<UserType> {}

// схема
const NewSchema = new Schema<UserType, UserModel, UserType>({
  nickname: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  roleId: { type: ObjectId, required: true, ref: EModels.roles },
  FIO: {
    firstName: { type: String, require: true },
    middleName: { type: String, require: true },
    lastName: { type: String, require: true },
  },
  mail: { type: String, require: true },
  money: { type: Number, require: true, default: 0 },
  likeMoney: { type: Number, require: true, default: 0 },
  classId: { type: Schema.Types.ObjectId, ref: EModels.classes },
});

// создание отдельного списка достижеий (системных)
NewSchema.post("save", async (doc: UserType) => {
  await AchievementAccounts.create({
    accountId: doc._id,
    moduleId: undefined,
    achievementIds: [],
  });
  let charters = await Modules.find({
    lvl: 0,
  });
  if (charters.length > 0) {
    for (let i = 0; i < charters.length; i++) {
      const charter = charters[i];
      await AchievementAccounts.create({
        accountId: doc._id,
        moduleId: charter._id,
        achievementIds: [],
      });
    }
  }
});

// удаление всех достижений пользователя
NewSchema.pre("deleteOne", { document: true, query: false }, async function (
  next
) {
  await AchievementAccounts.deleteMany({
    accountId: this._id,
  });
});

// экспорт самой модели
export const Users: UserModel = <UserModel>model(EModels.users, NewSchema);
