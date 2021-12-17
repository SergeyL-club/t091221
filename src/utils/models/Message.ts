import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";

// интерфейс message
export interface IMessage {
  authorId: Schema.Types.ObjectId;
  desc: string;
  likeIds?: Array<Types.ObjectId>;
  moduleId: Schema.Types.ObjectId;
}

// расширенный тип
interface MessageType extends IMessage, Document {}

// интерфейс модели
interface MessageModel extends Model<MessageType> {}

// схема
const NewSchema = new Schema<MessageType, MessageModel, MessageType>({
  authorId: { type: Schema.Types.ObjectId, required: true, ref: EModels.users },
  desc: { type: String, required: true },
  likeIds: [{ type: Schema.Types.ObjectId, ref: EModels.users }],
  moduleId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: EModels.modules,
  },
});

// экспорт самой модели
export const Messages: MessageModel = <MessageModel>(
  model(EModels.messages, NewSchema)
);
