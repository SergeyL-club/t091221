import { createConnection } from "mongoose";
import { logger } from "./logger";
import { EModels } from "./models/enumModels";
import { hashSync } from "bcrypt";

const conn = createConnection(`${DB_URL}`, {
  autoIndex: true,
  autoCreate: true,
});

const Models = require("./models");

conn.once("open", async () => {
  logger.info(`Open db ${DB_NAME}`);
  conn.modelNames().forEach((name) => {
    logger.info(`Connected model ${name}`);
  });

  conn.db.collections().then((collections) => {
    collections.forEach((collection) => {
      if (!(collection.collectionName in Models)) {
        logger.info(`Unregistered model ${collection.collectionName}`);
        conn.dropCollection(collection.collectionName);
        logger.info(`Drop collection ${collection.collectionName}`);
      }
    });
  });

  conn.db.collections().then((collections) => {
    collections.forEach((collection) => {
      if (collection.collectionName === EModels.roles) {
        collection.findOne({ isAdminFun: true }).then((result) => {
          if (!result) {
            collection.insertOne({
              name: "Admin",
              isAdminFun: true,
              isClientFun: false,
            });

            collection.insertOne({
              name: "Student",
              isAdminFun: false,
              isClientFun: true,
            });
          }
        });
      } else if (collection.collectionName === EModels.users) {
        collection.findOne({ nickname: "german" }).then((result) => {
          if (!result) {
            let role = collections.filter(
              (item) => item.collectionName === EModels.roles
            );
            role[0].findOne({ isAdminFun: true }).then((adminRole) => {
              if (adminRole) {
                collection.insertOne({
                  nickname: "piton",
                  passwordHash: hashSync("piton", 7),
                  roleId: adminRole._id,
                  FIO: {
                    firstName: "",
                    middleName: "",
                    lastName: "",
                  },
                  mail: "admin@mail.ru",
                  money: 0,
                  likeMoney: 0,
                });
              }
            });
          }
        });
      }
    });
  });

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
