import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Messages } from "../utils/models/Message";
import { Modules } from "../utils/models/Module";
import { IAccount } from "./interfaces";

// интерфейс input создания сообщения
interface inputSetMessage {
  desc: string;
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfISM = (object: any): object is inputSetMessage => {
  return "desc" in object && "moduleId" in object;
};

// api регистрация сообщения
const setMessage = async (account: IAccount, data: inputSetMessage) => {
  // проверки
  if (!data || !instanceOfISM(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.moduleId) }))) {
    throw new ApiError(400, `Module undefined`);
  }

  // создание и сохранение сообщений
  let moduleDoc = await Modules.findOne({
    _id: new Types.ObjectId(data.moduleId),
  });
  if (moduleDoc) {
    let newMessageDoc = await Messages.create({
      authorId: account._id,
      desc: data.desc,
      moduleId: data.moduleId,
      likeIds: undefined,
    });

    return {
      newMessage: newMessageDoc,
    };
  }
};

// интерфейс input регистрации и удалении
interface inputSetOrRemLike {
  messageId: string;
}

// функция проверки всех параметров input
const instanceOfISORL = (object: any): object is inputSetOrRemLike => {
  return "messageId" in object;
};

// api регистрации и удалении лайка
const toggleLike = async (account: IAccount, data: inputSetOrRemLike) => {
  // проверки
  if (!data || !instanceOfISORL(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Messages.findOne({ _id: new Types.ObjectId(data.messageId) }))) {
    throw new ApiError(400, `Message undefined`);
  }

  // проверка на поставление лайка
  let candidate = await Messages.findOne({
    _id: new Types.ObjectId(data.messageId),
  });
  if (candidate) {
    if (
      await Messages.findOne({
        _id: candidate._id,
        likeIds: { $in: [account._id] },
      })
    ) {
      await Messages.updateOne(
        {
          _id: candidate._id,
        },
        {
          $pull: {
            likeIds: account._id,
          },
        }
      );
      return { Ok: true };
    } else {
      await Messages.updateOne(
        {
          _id: candidate._id,
        },
        {
          $addToSet: {
            likeIds: account._id,
          },
        }
      );
      return { Ok: true };
    }
  }
  return { Ok: false };
};

// экспорт api функций
module.exports = {
  setMessage,
  toggleLike,
};
