import { cpus } from "os";
import express from "express";
import { logger } from "./utils/logger";
import cluster from "cluster";
import { config } from "dotenv";
import { resolve } from "path/posix";

// env
config({
  path: resolve(__dirname, "../.env"),
});

// установка стандартных глобальных переменных
global.PORT = Number(process.env.PORT) ? Number(process.env.PORT) : 4000;
global.GLOBAL_DIR = __dirname;
global.DB_NAME = process.env.DB_NAME ? process.env.DB_NAME : "ApiDefaultDB";

// проверка на несколько потоков (если вкл мод, то половина потоков процессора, иначе или --- --cp настраивается или просто 1 (без --cp))
if (process.argv.indexOf("--multi") !== -1) {
  global.WORKER_COUNT = cpus().length / 2;
} else if (process.argv.indexOf("--cp") !== -1) {
  global.WORKER_COUNT = Number(process.argv[process.argv.indexOf("--cp") + 1]);
} else {
  global.WORKER_COUNT = 1;
}

// url для подключения к базе
global.DB_URL = `mongodb://localhost:27017/${DB_NAME}`;

// app
global.APP = express();

// secret key env
if (process.env.SECRET_KEY) {
  global.SECRET_KEY = process.env.SECRET_KEY;
} else {
  throw new Error("No env secret key!!!");
}

// логирование
if (cluster.isPrimary) logger.info(`Created app global`);

// запуск сервера
if (cluster.isPrimary) logger.info(`Run cluster`);
require("./utils/cluster");
