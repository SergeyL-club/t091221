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
interface RoleType extends IRole, Document {}

// interface model
interface RoleModel extends Model<RoleType> {}

// Schema
const NewSchema = new Schema<RoleType, RoleModel, RoleType>({});

// export model
export const Roles: RoleModel = <RoleModel>model(EModels.roles, NewSchema);
