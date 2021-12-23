import fs, { ReadStream } from "fs";
import { ApiError } from "../utils/apiError";
import { IAccount } from "./interfaces";

// интерфейс input загрузка заданий
interface inputXlsxSetQuestion {
  xlsx: ReadStream;
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

  // xlsx
  let excelFile = await fs.promises.readFile(data.xlsx.path);

  // возвращение ответа
  return { data };
};

// экспорт api функций
module.exports = {
  setQuestions,
};
