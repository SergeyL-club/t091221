import { Collection, createConnection } from "mongoose";
import { logger } from "./logger";
import { EModels } from "./models/enumModels";
import { hashSync } from "bcrypt";

const conn = createConnection(`${DB_URL}`, {
  autoIndex: true,
  autoCreate: true,
});

const Models = require("./models");

conn.once("open", function () {
  logger.info(`Open db ${DB_NAME}`);

  // подгрузка (создание) нужных коллекций
  for (const nameModel in Models) {
    conn.db.listCollections({ name: nameModel }).next((e, collinfo) => {
      if (collinfo) {
        logger.info(`Connected model ${nameModel}`);
      } else {
        logger.info(`Model ${nameModel} was not found`);
        conn.db.createCollection(nameModel);
        logger.info(`Created and connected model ${nameModel}`);
      }
    });
  }

  conn.db.collections().then((collections) => {
    return new Promise<any>(async (resolve) => {
      let collectionsDoneCount = 0;
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
      resolve(collections);
    }).then(async (collections): Promise<void> => {
      let RoleCollection = collections
        .filter((item: Collection) => item.collectionName === EModels.roles)
        .pop();
      if (!RoleCollection) {
        RoleCollection = conn.db.collection(EModels.roles);
      }
      let UserCollection = collections
        .filter((item: Collection) => item.collectionName === EModels.users)
        .pop();
      if (!UserCollection) {
        UserCollection = conn.db.collection(EModels.users);
      }

      // Добавляем стандартные роли
      if (!(await RoleCollection.findOne({ isAdminFun: true }))) {
        logger.info(`No role admin`);
        await RoleCollection.insertOne({
          name: "Admin",
          isAdminFun: true,
          isClientFun: false,
        });
        logger.info(`Create role admin`);
      }
      if (!(await RoleCollection.findOne({ isClientFun: true }))) {
        logger.info(`No role student`);
        await RoleCollection.insertOne({
          name: "Student",
          isAdminFun: false,
          isClientFun: true,
        });
        logger.info(`Create role student`);
      }

      // Добавляем стандартных пользователей
      if (!(await UserCollection.findOne({ nickname: "piton" }))) {
        logger.info(`No admin default`);
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
          logger.info(`Create admin default`);
        }
      }
    });
  });
});
