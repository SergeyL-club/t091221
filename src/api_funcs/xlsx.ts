import fs, { ReadStream } from "fs";
import { ApiError } from "../utils/apiError";
import { IAccount } from "./interfaces";
import { normalizeTable } from "../utils/xlsxTable";
import { resolve } from "path/posix";

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
  if (typeof data.xlsx.path === "string") {
    let excelData = await fs.promises.readFile(data.xlsx.path);
    let filename = /^(.*)\/(\w+)\.xlsx$/.exec(data.xlsx.path);
    let next_dir = data.xlsx.path;

    if (filename) {
      // await fs.promises.writeFile(
      //   resolve(global.GLOBAL_DIR, `/tmp/${filename[2]}.xlsx`),
      //   excelData
      // );
      next_dir = `${global.GLOBAL_DIR}/tmp/${filename[2]}.xlsx`;
      fs.copyFileSync(data.xlsx.path, next_dir)
    }
    let excelJson = normalizeTable(next_dir);

    // возвращение ответа
    return { excelJson };
  } else return { Ok: false };
};

// экспорт api функций
module.exports = {
  setQuestions,
};
