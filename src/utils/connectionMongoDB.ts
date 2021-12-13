import { connect } from 'mongoose'
import { logger } from './logger'

connect(`mongodb://localhost:27017/${global.DB_NAME}`, (e) =>{
  if(e) throw e
  else logger.info(`Connection mongoDB ${global.DB_NAME}`)
})