import { model, Schema, Model, Document } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс module
export interface IModule {
  name: string;
  desc: string;
  lvl: number;
  childIds?: Array<Schema.Types.ObjectId>;
  questionIds?: Array<Schema.Types.ObjectId>;
  accountWNA?: Array<Schema.Types.ObjectId>;
}

// расширенный тип
interface ModuleType extends IModule, Document {}

// интерфейс модели
interface ModuleModel extends Model<ModuleType> {}

// схема
const NewSchema = new Schema<ModuleType, ModuleModel, ModuleType>({
  name: { type: String, required: true, unique: true },
  desc: { type: String, required: true, default: "" },
  lvl: { type: Number, default: 0 },
  childIds: [{ type: Schema.Types.ObjectId, ref: EModels.modules }],
  questionIds: [{ type: Schema.Types.ObjectId, ref: EModels.questions }],
  accountWNA: [{ type: Schema.Types.ObjectId, ref: EModels.users }],
});

// экспорт самой модели
export const Modules: ModuleModel = <ModuleModel>(
  model(EModels.modules, NewSchema)
);
