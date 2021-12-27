import fs, { ReadStream } from "fs";
import { ApiError } from "../utils/apiError";
import { IAccount } from "./interfaces";
import { importTest } from "../utils/xlsxTable";

// интерфейс input загрузка заданий
interface inputXlsxSetQuestion {
  xlsx: ReadStream,
  moduleId?: string
}

// функция проверки всех параметров input
const instanceOfISXQ = (object: any): object is inputXlsxSetQuestion => {
  return "xlsx" in object;
};

// api xlsx загрузка заданий
const setQuestions = async (account: IAccount, data: inputXlsxSetQuestion) => {
  // проверки
  if (!account.role.isAdminFun) {
    throw new ApiError(403, `Can't access this request`);
  }
  if (!data || !instanceOfISXQ(data)) {
    throw new ApiError(400, `Not enough input`);
  }

  // парсинг и запись в бд
  if (typeof data.xlsx.path === "string") {
    // получение основных путей
    let filename = /^(.*)\/(\w+)\.xlsx$/.exec(data.xlsx.path);
    let next_dir = data.xlsx.path;
    if (filename) {
      next_dir = `${global.GLOBAL_DIR}/tmp/${filename[2]}.xlsx`;
      fs.copyFileSync(data.xlsx.path, next_dir)
    }

    // Получаем модуль
    let module: any = (data.moduleId) ?? false;

    // основная работа
    await importTest(account, next_dir, module);

    // возвращение ответа
    return { loaded: true };
  } else return { Ok: false };
};

// экспорт api функций
module.exports = {
  setQuestions,
};
