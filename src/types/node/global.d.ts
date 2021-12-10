import { Express } from 'express'

declare global {
  var PORT: number
  var API_FUNC_ADR: string
  var worker_count: number
  var app: Express
  var db_name: string
}

export {}