import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { Messages } from "../utils/models/Message";
import { Modules } from "../utils/models/Module";
import { Users } from "../utils/models/User";
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

// интерфейс input регистрации и удалении
interface inputGetMessagesModule {
  moduleId: string;
}

// функция проверки всех параметров input
const instanceOfIGMM = (object: any): object is inputGetMessagesModule => {
  return "moduleId" in object;
};

// api регистрации и удалении лайка
const getMesagesModule = async (
  account: IAccount,
  data: inputGetMessagesModule
) => {
  // проверки
  if (!data || !instanceOfIGMM(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (!(await Modules.findOne({ _id: new Types.ObjectId(data.moduleId) }))) {
    throw new ApiError(400, `Module undefined`);
  }

  // получение всех сообщений по модулю
  let messageDocs = await Messages.aggregate([
    {
      $match: {
        moduleId: new Types.ObjectId(data.moduleId),
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likeIds" },
      },
    },
    {
      $lookup: {
        from: Users.modelName,
        localField: "authorId",
        foreignField: "_id",
        as: "author",
      },
    },
    {
      $lookup: {
        from: Modules.modelName,
        localField: "moduleId",
        foreignField: "_id",
        as: "module",
      },
    },
    {
      $project: {
        desc: 1,
        likeCount: 1,
        "author._id": 1,
        "author.nickname": 1,
        "module._id": 1,
        "module.name": 1,
      },
    },
  ]);

  // отправка результата
  return { messages: messageDocs };
};

// интерфейс input удаления сообщения
interface inputRemMessage {
  messageId: string;
}

// функция проверки всех параметров input
const instanceOfIRM = (object: any): object is inputRemMessage => {
  return "messageId" in object;
};

// api удаление сообщений
const remMessage = async (account: IAccount, data: inputRemMessage) => {
  // проверки
  if (!data || !instanceOfIRM(data)) {
    throw new ApiError(400, `Not enough input`);
  }
  if (
    !(await Messages.findOne({
      _id: new Types.ObjectId(data.messageId),
      authorId: account._id,
    }))
  ) {
    throw new ApiError(400, `Module undefined`);
  }

  // удаление сообщения
  let delMessage = await Messages.findOne({
    _id: new Types.ObjectId(data.messageId),
    authorId: account._id,
  });
  await Messages.remove({
    _id: new Types.ObjectId(data.messageId),
    authorId: account._id,
  });

  // возвращение ответа
  return { Ok: true, delete: true, delMessage };
};

// экспорт api функций
module.exports = {
  setMessage,
  toggleLike,
  getMesagesModule,
  remMessage,
};
