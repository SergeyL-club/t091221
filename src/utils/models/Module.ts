import { model, Schema, Model, Document, Types } from "mongoose";
import { AchievementAccounts } from "./AchievementAccount";
import { EModels } from "./enumModels";
import { Questions } from "./Question";
import { Roles } from "./Role";
import { Users } from "./User";

// интерфейс module
export interface IModule {
  name: string;
  desc: string;
  lvl: number;
  childIds?: Array<Types.ObjectId>;
  questionIds?: Array<IQuestion>;
  accountWNA?: Array<Schema.Types.ObjectId>;
}

// элемент списка question ids
interface IQuestion {
  _id: Types.ObjectId;
  milestone: boolean;
}

// расширенный тип
export interface ModuleType extends IModule, Document {}

// интерфейс модели
interface ModuleModel extends Model<ModuleType> {
  conQuestion: (
    moduleId: Types.ObjectId,
    questionId: Types.ObjectId,
    milestone: boolean,
    addOrDel: boolean
  ) => boolean;
  conChild: (
    parentId: Types.ObjectId,
    childId: Types.ObjectId,
    addOrDel: boolean
  ) => boolean;
}

// схема
const NewSchema = new Schema<ModuleType, ModuleModel, ModuleType>({
  name: { type: String, required: true, unique: true },
  desc: { type: String, required: true, default: "" },
  lvl: { type: Number, default: 0 },
  childIds: [{ type: Schema.Types.ObjectId, ref: EModels.modules }],
  questionIds: [
    {
      _id: {
        type: Schema.Types.ObjectId,
        ref: EModels.questions,
        required: true,
      },
      milestone: { type: Boolean, required: true },
    },
  ],
  accountWNA: [{ type: Schema.Types.ObjectId, ref: EModels.users }],
});

// изменение связей задач
NewSchema.statics.conQuestion = async (
  moduleId: Types.ObjectId,
  questionId: Types.ObjectId,
  milestone: boolean,
  addOrDel: boolean
) => {
  // проверки
  let candidateModule;
  if (!(candidateModule = await Modules.findOne({ _id: moduleId }))) {
    return false;
  }
  let candidateQuestion;
  if (!(candidateQuestion = await Questions.findOne({ _id: questionId }))) {
    return false;
  }
  if (candidateModule && candidateQuestion && candidateModule.questionIds) {
    // создание новой записи
    if (addOrDel) {
      // замена milestone
      for (let i = 0; i < candidateModule.questionIds.length; i++) {
        const question = candidateModule.questionIds[i];

        if (question._id.toString() === questionId.toString()) {
          await Modules.updateOne(
            { _id: moduleId },
            {
              $pullAll: {
                questionIds: [
                  { _id: questionId, milestone: true },
                  { _id: questionId, milestone: false },
                ],
              },
            }
          );
          await Modules.updateOne(
            { _id: moduleId },
            {
              $addToSet: {
                questionIds: { _id: questionId, milestone },
              },
            }
          );
          return true;
        }
      }

      // если записи нету
      await Modules.updateOne(
        { _id: moduleId },
        {
          $addToSet: {
            questionIds: { _id: questionId, milestone },
          },
        }
      );
      return true;
    } else {
      await Modules.updateOne(
        { _id: moduleId },
        {
          $pullAll: {
            questionIds: [
              { _id: questionId, milestone: true },
              { _id: questionId, milestone: false },
            ],
          },
        }
      );
      return true;
    }
  }
};

// изменение связей детей
NewSchema.statics.conChild = async (
  parentId: Types.ObjectId,
  childId: Types.ObjectId,
  addOrDel: boolean
) => {
  if (addOrDel) {
    let parent = await Modules.findOne({ _id: new Types.ObjectId(parentId) });
    let child = await Modules.findOne({ _id: new Types.ObjectId(childId) });
    if (parent && child) {
      await Modules.updateOne(
        { _id: new Types.ObjectId(parentId) },
        {
          $addToSet: {
            childIds: new Types.ObjectId(childId),
          },
        }
      );
      await Modules.updateOne(
        { _id: new Types.ObjectId(childId) },
        {
          lvl: parent.lvl + 1,
        }
      );
      return true;
    } else return false;
  } else {
    let parent = await Modules.findOne({ _id: new Types.ObjectId(parentId) });
    let child = await Modules.findOne({ _id: new Types.ObjectId(childId) });
    if (parent && child) {
      await Modules.updateOne(
        { _id: new Types.ObjectId(parentId) },
        {
          $pull: {
            childIds: new Types.ObjectId(childId),
          },
        }
      );
      await Modules.updateOne(
        { _id: new Types.ObjectId(childId) },
        {
          lvl: -1,
        }
      );
      return true;
    } else return false;
  }
};

// при добавление модуля, если это предмет (lvl = 0), создание списка достижений
NewSchema.post("save", async (doc: ModuleType) => {
  if (doc.lvl === 0) {
    let candidates = await Users.aggregate([
      {
        $lookup: {
          from: Roles.modelName,
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $match: {
          "role.isClientFun": true,
        },
      },
    ]);
    if (candidates.length > 0) {
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        await AchievementAccounts.create({
          accountId: candidate._id,
          moduleId: doc._id,
          achievementIds: [],
        });
      }
    }
  }
});

// при удалении модуля, если это предмет (lvl = 0), удаление у всех клиентов
NewSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    if (this.lvl === 0) {
      console.log(this._id);
      await AchievementAccounts.deleteMany({
        moduleId: this._id,
      });
    }
    next();
  }
);

// полный запрет
NewSchema.pre("save", { document: true, query: false }, async function (next) {
  const candidates = await Users.find({});

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (this.accountWNA) {
      this.accountWNA.push(candidate._id);
    } else {
      this.accountWNA = [candidate._id];
    }
  }

  next();
});

// экспорт самой модели
export const Modules: ModuleModel = <ModuleModel>(
  model(EModels.modules, NewSchema)
);
