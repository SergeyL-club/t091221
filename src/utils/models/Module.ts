import { model, Schema, Model, Document, Types } from "mongoose";
import { EModels } from "./enumModels";
import { Questions } from "./Question";

// интерфейс module
export interface IModule {
  name: string;
  desc: string;
  lvl: number;
  childIds?: Array<Schema.Types.ObjectId>;
  questionIds?: Array<IQuestion>;
  accountWNA?: Array<Schema.Types.ObjectId>;
}

// элемент списка question ids
interface IQuestion {
  _id: Types.ObjectId;
  milestone: boolean;
}

// расширенный тип
interface ModuleType extends IModule, Document {}

// интерфейс модели
interface ModuleModel extends Model<ModuleType> {
  conQuestion: (
    moduleId: Types.ObjectId,
    questionId: Types.ObjectId,
    milestone: boolean,
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
        unique: true,
      },
      milestone: { type: Boolean, required: true },
    },
  ],
  accountWNA: [{ type: Schema.Types.ObjectId, ref: EModels.users }],
});

// изменение связей
NewSchema.statics.conQuestion = async (
  moduleId: Types.ObjectId,
  questionId: Types.ObjectId,
  milestone: boolean,
  addOrDel: number
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

// TODO: post save
NewSchema.post("save", (doc) => {});

// экспорт самой модели
export const Modules: ModuleModel = <ModuleModel>(
  model(EModels.modules, NewSchema)
);
