import cluster from 'cluster'
import { logger } from './logger'
import fs from 'fs'
import { Response } from './response'
import bodyParser from 'body-parser'
import os from 'os'
import expressFormData from 'express-form-data'
import path from 'path/posix'
import { connect } from 'mongoose'
import { verify } from './verifyToken'

// проверка на пустой obj
function isEmpty(obj: Object) {
  return Object.keys(obj).length === 0;
}

// logger worker
const logWork = ( data: any, req: any, input: boolean ) => {
  if(input) {
    logger.info({ pid: process.pid+", "+cluster.worker?.id, data: data }, `Take ${req.method} ${req.params.module}/${req.params.action}`)
  } else {
    logger.info({ pid: process.pid+", "+cluster.worker?.id, data: data }, `Response ${req.method} ${req.params.module}/${req.params.action}`)
  }
}

// connect db mongo 
if(cluster.isMaster) require("./connectionMongoDB")


// json parser
const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false }) 
APP.use(urlencodedParser)
APP.use(jsonParser)

// form data
APP.use(expressFormData.parse(
  {
    uploadDir: os.tmpdir(),
    autoClean: true
  }
))
APP.use(expressFormData.format())
APP.use(expressFormData.stream())
APP.use(expressFormData.union())

// список api функций
const modules = require(path.join(GLOBAL_DIR, "api_funcs")) 

// загрузка api в express
APP.use("/:module/:action", async ( req, res, next ) => {

  if ( cluster.isWorker ) {
    let data = (req.method === "GET") ? req.query : (req.method === "POST") ? req.body : undefined
    
    // проверка на пустой объект
    if(isEmpty(data)) data = undefined
    
    // логирование
    logWork(data, req, true)

    let moduleName = req.params.module
    let actionName = req.params.action

    if( modules[moduleName][actionName] ) {
      let func = modules[moduleName][actionName]
      try {

        let account = await verify(req)

        // результат выполнения запроса
        let result = await func(account, data)

        // логирование
        logWork(result, req, false)

        // возвращение ответа
        return res.json(Response.send(result))
  
      } 
      catch ( e: any ) {
        
        // логирование
        logger.error({ 
          pid: process.pid+", "+cluster.worker?.id, 
          data: e["getJson"]? e.getJson() : e.toString() }, 
          `Response ${req.method} ${req.params.module}/${req.params.action}`
        )
      
        if(e["getJson"]) {
            
          // json ошибка
          let errorJson = e.getJson();

          // возвращение ответа
          return res.status(errorJson.code).json(errorJson).end();
        
        }
        
        // если не json ошибка
        return res.end(e.toString());
      
      }
    }
  }

  next()

})

// main get
APP.get('/', (req, res) => res.send('Cluster mode.'));

if ( cluster.isMaster ) {

  // запуск работников
  for ( let i = 0; i < WORKER_COUNT; i++ ) cluster.fork()

  // метод регенерации работников
  cluster.on('exit', (worker, code) => {    
    const newWorker = cluster.fork()
  })



} 
// настройка рабочего
else {
  APP.listen(PORT, () =>
    logger.info(`Worker ${cluster.worker?.id} launched, pid: ${process.pid}, port: ${PORT}`)
  );
  connect(DB_URL)
}
