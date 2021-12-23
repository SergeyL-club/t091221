import cluster from 'cluster';
import { logger, loggerWorker } from './logger';
import fs from 'fs';
import { Response } from './response';
import bodyParser from 'body-parser';
import os from 'os';
import expressFormData from 'express-form-data';
import path from 'path/posix';
import { connect } from 'mongoose';
import { verify } from './verifyToken';

/**
 * verification empty
 * @param obj - verifiable object 
 * @returns true or false
 */
function isEmpty(obj: Object) {
  return Object.keys(obj).length === 0;
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

// modules api funcs
const modules = require(path.join(GLOBAL_DIR, "api_funcs")) 

// load api in express
APP.use("/:module/:action", async ( req, res, next ) => {

  if ( cluster.isWorker ) {
    // get data
    let data = (req.method === "GET") ? req.query : (req.method === "POST") ? req.body : undefined
    
    // check empty
    if(isEmpty(data)) data = undefined
    
    // loging
    loggerWorker.info({ data }, `Take ${req.method} ${req.params.module}/${req.params.action}`)

    // names
    let moduleName = req.params.module
    let actionName = req.params.action

    // check func api
    if( modules[moduleName] && modules[moduleName][actionName] ) {
      
      // func
      let func = modules[moduleName][actionName]
      
      try {

        let account
        
        // verify token, check no verify array funcs
        if( modules["noVerify"][moduleName] ) {
          if( modules["noVerify"][moduleName].indexOf(actionName) === -1 ) {
            account = await verify(req)
          }
        } else if(!( modules["noVerify"][moduleName] )) {
          account = await verify(req)
        }

        // start func
        let result = await func(account, data)

        // logging
        loggerWorker.info({ data: result }, `Response ${req.method} ${req.params.module}/${req.params.action}`)

        // response
        return res.json(Response.send(result))
  
      } 
      catch ( e: any ) {
        
        // logging
        logger.error({ 
          pid: process.pid+", "+cluster.worker?.id, 
          data: e["getJson"]? e.getJson() : e.toString() }, 
          `Response ${req.method} ${req.params.module}/${req.params.action}`
        )
      
        if(e["getJson"]) {
            
          // json error
          let errorJson = e.getJson();

          // response
          return res.status(errorJson.code).json(errorJson).end()
        
        }
        
        // if not json error
        return res.end(e.toString())
      
      }
    } else {
      
      // logging
      logger.error({ pid: process.pid+", "+cluster.worker?.id },`No api url /${moduleName}/${actionName}`)
      
      // response "Api function undefined"
      return res.status(404).json(
          {
            type: "error",
            code: 404,
            message: "Api function undefined"     
          }
        ).end()
    }
  }

  next()

})

// main get
APP.get('/', (req, res) => res.send('Cluster mode.'));

if ( cluster.isMaster ) {

  // running workers
  for ( let i = 0; i < WORKER_COUNT; i++ ) cluster.fork()

  
  
  
} 
// setting worker
else {

  // listen port
  APP.listen(PORT, () =>
  logger.info(`Worker ${cluster.worker?.id} launched, pid: ${process.pid}, port: ${PORT}`)
  );

  // regeneration worker
  cluster.on("disconnect", () => {
    const newWorker = cluster.fork()
  })
  cluster.on('exit', (worker, code) => {    
    logger.info(`exit worker`)
    const newWorker = cluster.fork()
  })

  // connect to MongoDB
  connect(DB_URL)
}
