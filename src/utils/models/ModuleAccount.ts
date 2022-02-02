import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс class
export interface IModuleAccount {
  accountId: Types.ObjectId;
  moduleId: Types.ObjectId;
  progress: number;
  correctAnswers?: Array<Types.ObjectId>;
}

// расширенный тип
interface ModuleAccountType extends IModuleAccount, Document {}

// интерфейс модели
interface ModuleAccountModel extends Model<ModuleAccountType> {}

// схема
const NewSchema = new Schema<
  ModuleAccountType,
  ModuleAccountModel,
  ModuleAccountType
>({
  accountId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: EModels.users,
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: EModels.modules,
  },
  progress: { type: Number, required: true, default: 0 },
  correctAnswers: [{ type: Schema.Types.ObjectId, ref: EModels.questions }],
});

// экспорт самой модели
export const ModuleAccounts: ModuleAccountModel = <ModuleAccountModel>(
  model(EModels.moduleAccounts, NewSchema)
);
