import { createConnection } from "mongoose";
import { logger } from "./logger";

// master connect
const conn = createConnection(`${DB_URL}`, {
  autoIndex: true,
  autoCreate: true,
});

// models array
const Models = require("./models");

// open connect async
conn.once("open", async () => {
  logger.info(`Open db ${DB_NAME}`);
  conn.modelNames().forEach((name) => {
    logger.info(`Connected model ${name}`);
  });

  // drop other models
  conn.db.collections().then((collections) => {
    collections.forEach((collection) => {
      if (!(collection.collectionName in Models)) {
        logger.info(`Unregistered model ${collection.collectionName}`);
        conn.dropCollection(collection.collectionName);
        logger.info(`Drop collection ${collection.collectionName}`);
      }
    });
  });

  // create new models (empty)
  for (const nameModel in Models) {
    conn.db.listCollections({ name: nameModel }).next((e, collinfo) => {
      if (collinfo) {
        logger.info(`Connected model ${nameModel}`);
      } else {
        logger.info(`Model ${nameModel} was not found`);
        conn.createCollection(nameModel);
        logger.info(`Created and connected model ${nameModel}`);
      }
    });
  }
});
