import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс achievement
export interface IAchievement {
  name: string;
  desc: string;
  imgUrl: string;
  moduleIds?: Array<Types.ObjectId>;
}

// расширенный тип
interface AchievementType extends IAchievement, Document {}

// интерфейс модели
interface AchievementModel extends Model<AchievementType> {}

// схема
const NewSchema = new Schema<
  AchievementType,
  AchievementModel,
  AchievementType
>({
  name: { type: String, required: true },
  desc: { type: String, required: true },
  imgUrl: { type: String, required: true },
  moduleIds: [{ type: Schema.Types.ObjectId }],
});

// экспорт самой модели
export const Achievements: AchievementModel = <AchievementModel>(
  model(EModels.achievements, NewSchema)
);
