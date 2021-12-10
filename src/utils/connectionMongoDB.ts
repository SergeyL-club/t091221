import { connect } from 'mongoose'
import { logger } from './logger'

connect(`mongodb://localhost:27017/${global.db_name}`, (e) =>{
  if(e) throw e
  else logger.info(`Connection mongoDB ${global.db_name}`)
})