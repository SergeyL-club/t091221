import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс achievement account
export interface IAchievementAccount {
  accountId: Types.ObjectId;
  moduleId?: Types.ObjectId;
  achievementIds: Array<Types.ObjectId>;
}

// расширенный тип
interface AchievementAccountType extends IAchievementAccount, Document {}

// интерфейс модели
interface AchievementAccountModel extends Model<AchievementAccountType> {}

// схема
const NewSchema = new Schema<
  AchievementAccountType,
  AchievementAccountModel,
  AchievementAccountType
>({
  accountId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: EModels.users,
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    default: undefined,
    ref: EModels.modules,
  },
  achievementIds: [{ type: Schema.Types.ObjectId, ref: EModels.achievements }],
});

// экспорт самой модели
export const AchievementAccounts: AchievementAccountModel = <
  AchievementAccountModel
>model(EModels.achievementAccounts, NewSchema);
