import { cpus } from 'os'
import { resolve } from 'path'
import express from 'express'
import { logger } from './utils/logger'
import cluster from 'cluster'

// установка стандартных глобальных переменных
global.PORT = 4000
global.API_FUNC_ADR = __dirname
global.db_name = "ApiDefault"

// количество процессов (половина от общих)
global.worker_count = cpus().length / 2

// app
global.app = express()

// логирование
if( cluster.isMaster ) logger.info(`Created app global`)

// запуск сервера
if( cluster.isMaster ) logger.info(`Run cluster`)
require("./utils/cluster")