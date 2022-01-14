import { Collection, createConnection } from "mongoose";
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
    return new Promise<any>(async (resolve) => {
      let collectionsDoneCount = 1;
      const checkResolve = () => {
        collectionsDoneCount++;
        if (collectionsDoneCount === collections.length) resolve(collections);
      };
      // Удаление лишних колекций
      for (const collection of collections) {
        if (!(collection.collectionName in Models)) {
          logger.info(`Unregistered model ${collection.collectionName}`);
          await conn.dropCollection(collection.collectionName);
          logger.info(`Drop collection ${collection.collectionName}`);
        }
        checkResolve();
      }
    }).then(async (collections): Promise<void> => {
      const RoleCollection = collections
        .filter((item: Collection) => item.collectionName === EModels.roles)
        .pop();
      const UserCollection = collections
        .filter((item: Collection) => item.collectionName === EModels.users)
        .pop();

      // Добавляем стандартные роли
      if (!(await RoleCollection.findOne({ isAdminFun: true }))) {
        await RoleCollection.insertOne({
          name: "Admin",
          isAdminFun: true,
          isClientFun: false,
        });

        await RoleCollection.insertOne({
          name: "Student",
          isAdminFun: false,
          isClientFun: true,
        });
      }

      // Добавляем стандартных пользователей
      if (!(await UserCollection.findOne({ nickname: "german" }))) {
        const adminRole = await RoleCollection.findOne({ isAdminFun: true });
        if (adminRole) {
          await UserCollection.insertOne({
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
