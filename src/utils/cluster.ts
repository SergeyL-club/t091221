import cluster from 'cluster'
import { logger } from './logger'
import fs from 'fs'
import { Response } from './response'
import bodyParser from 'body-parser'
import os from 'os'
import expressFormData from 'express-form-data'
import path from 'path/posix'

// logger worker
const logWork = ( data: any, req: any, input: boolean ) => {
  if(input) {
    logger.info({ pid: process.pid+", "+cluster.worker?.id, data: data }, `Take ${req.method} ${req.params.module}/${req.params.action}`)
  } else {
    logger.info({ pid: process.pid+", "+cluster.worker?.id, data: data }, `Response ${req.method} ${req.params.module}/${req.params.action}`)
  }
}

// json parser
const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({ extended: false }) 
app.use(urlencodedParser)
app.use(jsonParser)

// form data
app.use(expressFormData.parse(
  {
    uploadDir: os.tmpdir(),
    autoClean: true
  }
))

app.use(expressFormData.format())
app.use(expressFormData.stream())
app.use(expressFormData.union())

const modules = require(path.join(API_FUNC_ADR, "api_funcs")) 

// загрузка api в express
app.use("/:module/:action", async ( req, res, next ) => {

  if ( cluster.isWorker ) {
    let data = (req.method === "GET") ? req.query : (req.method === "POST") ? req.body : null
    logWork(data, req, true)

    let moduleName = req.params.module
    let actionName = req.params.action

    if( modules[moduleName][actionName] ) {
      let func = modules[moduleName][actionName]
      try {

        // результат выполнения запроса
        let result = await func(req, data)

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
app.get('/', (req, res) => res.send('Cluster mode.'));

if ( cluster.isMaster ) {

  // проверка на несколько потоков (если вкл мод, то половина потоков процессора)
  if(process.argv.indexOf("--multi") === -1) {
    worker_count = 1
  }

  // connect db mongo
  if( cluster.isMaster ) require("./connectionMongoDB")

  // запуск работников
  for ( let i = 0; i < worker_count; i++ ) cluster.fork()

  // метод регенерации работников
  cluster.on('exit', (worker, code) => {    
    const newWorker = cluster.fork()
  })

} else // настройка рабочего
  app.listen(PORT, () =>
    logger.info(`Worker ${cluster.worker?.id} launched, pid: ${process.pid}, port: ${PORT}`)
  );
