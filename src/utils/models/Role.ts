import { model, Schema, Model, Document } from "mongoose";
import { EModels } from "./enumModels";

// global consts

// interface role
export interface IRole {
  name: string;
  isAdminFun: boolean;
  isOtherFun: boolean;
}

// extended type
export interface RoleType extends IRole, Document {}

// interface model
interface RoleModel extends Model<RoleType> {}

// Schema
const NewSchema = new Schema<RoleType, RoleModel, RoleType>({
  name: { type: String, required: true, unique: true },
  isAdminFun: { type: Boolean, required: true, default: false },
  isOtherFun: { type: Boolean, required: true, default: true },
});

// export model
export const Roles: RoleModel = <RoleModel>model(EModels.roles, NewSchema);
