import { Express } from 'express'

declare global {
  var PORT: number
  var GLOBAL_DIR: string
  var WORKER_COUNT: number
  var APP: Express
  var DB_NAME: string
  var DB_URL: string
  var SECRET_KEY: string
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string
      DB_NAME?: string
      SECRET_KEY?: string
    }
  }
}

export {}