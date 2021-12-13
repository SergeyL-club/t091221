import { cpus } from 'os'
import express from 'express'
import { logger } from './utils/logger'
import cluster from 'cluster'
import { config } from 'dotenv'
import { resolve } from 'path/posix'

// env
config({
  path: resolve(__dirname, "../.env")
})

// установка стандартных глобальных переменных
global.PORT = (Number(process.env.PORT)) ? Number(process.env.PORT) : 4000
global.GLOBAL_DIR = __dirname
global.DB_NAME = (process.env.DB_NAME) ? process.env.DB_NAME : "ApiDefaultDB"

// количество процессов (половина от общих)
global.WORKER_COUNT = cpus().length / 2

// app
global.APP = express()

// логирование
if( cluster.isMaster ) logger.info(`Created app global`)

// запуск сервера
if( cluster.isMaster ) logger.info(`Run cluster`)
require("./utils/cluster")