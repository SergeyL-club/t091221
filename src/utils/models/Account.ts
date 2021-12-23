import { model, Schema, Model, Document } from "mongoose";
import { EModels } from "./enumModels";

// global consts
type ObjectId = Schema.Types.ObjectId;
const ObjectId = Schema.Types.ObjectId;

// interface account
export interface IAccount {
  nickname: string;
  passwordHash: string;
  role: ObjectId;
  FIO: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
  mail: string;
}

// extended type
interface AccountType extends IAccount, Document {}

// interface model
interface AccountModel extends Model<AccountType> {}

// Schema
const NewSchema = new Schema<AccountType, AccountModel, AccountType>({
  nickname: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: ObjectId, required: true, ref: EModels.roles },
  FIO: {
    firstName: { type: String, require: true },
    middleName: { type: String, require: true },
    lastName: { type: String, require: true },
  },
  mail: { type: String, require: true },
});

// export model
export const Accounts: AccountModel = <AccountModel>(
  model(EModels.accounts, NewSchema)
);
