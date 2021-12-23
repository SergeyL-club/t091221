import { cpus } from "os";
import express from "express";
import { logger } from "./utils/logger";
import cluster from "cluster";
import config from "config";

// set global var
global.PORT = config.get("PORT") ? (config.get("PORT") as number) : 4000;
global.GLOBAL_DIR = __dirname;
global.SALT_PASSWORD = config.get("SALT_PASSWORD")
  ? (config.get("SALT_PASSWORD") as number)
  : 7;
global.DB_NAME = config.get("DB_NAME")
  ? (config.get("DB_NAME") as string)
  : "ApiDefaultDB";
global.SECRET_KEY = config.get("SECRET_KEY")
  ? (config.get("SECRET_KEY") as string)
  : "sdafvnmewbfghjsgadjh";
global.DB_URL = config.get("DB_URL")
  ? (config.get("DB_URL") as string)
  : `mongodb://localhost:27017/${DB_NAME}`;

// check multi, if no multi, check -- --cp number
if (process.argv.indexOf("--multi") !== -1) {
  global.WORKER_COUNT = cpus().length / 2;
} else if (process.argv.indexOf("--cp") !== -1) {
  global.WORKER_COUNT = Number(process.argv[process.argv.indexOf("--cp") + 1]);
} else {
  global.WORKER_COUNT = 1;
}

// app
global.APP = express();

// logging
if (cluster.isMaster) logger.info(`Created app global`);

// run cluster master or sync database
if (process.argv.indexOf("--sync") !== -1) {
  require("./utils/createDef");
} else {
  if (cluster.isMaster) logger.info(`Run cluster`);
  require("./utils/cluster");
}
