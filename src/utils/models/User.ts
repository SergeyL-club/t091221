import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

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
  classId: Schema.Types.ObjectId;
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

// TODO: post save
NewSchema.post("save", (doc) => {});

// экспорт самой модели
export const Users: UserModel = <UserModel>model(EModels.users, NewSchema);
