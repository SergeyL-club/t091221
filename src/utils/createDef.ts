import { createConnection, Types } from "mongoose";
import { IAccount } from "./models/Account";
import { EModels } from "./models/enumModels";
import { IRole } from "./models/Role";
import bcrypt from "bcrypt";
import { logger } from "./logger";

const conn = createConnection(`${DB_URL}`, {
  autoIndex: true,
  autoCreate: true,
});

conn.once("open", () => {
  // logging
  logger.info(`Run sync db ${DB_NAME}`);

  // select  default models
  conn.db.collections().then((collections) => {
    let accountCollection = false;
    let roleCollection = false;

    // check require models
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      if (collection.collectionName === EModels.accounts) {
        // logging
        logger.info(`Connected model accounts`);
        accountCollection = true;
      } else if (collection.collectionName === EModels.roles) {
        // logging
        logger.info(`Connected model roles`);
        roleCollection = true;
      }
    }

    // if empty, then create
    if (!accountCollection) {
      // logging
      logger.info(`Created default model accounts`);
      conn.db.createCollection(EModels.accounts);
    }
    if (!roleCollection) {
      // logging
      logger.info(`Created default model roles`);
      conn.db.createCollection(EModels.roles);
    }

    // create default role
    let role = conn.db.collection(EModels.roles);
    role.findOne({ isAdminFun: true }).then((roledoc) => {
      if (roledoc) {
        // logging
        logger.error(`Already created default role`);

        // create default account
        let account = conn.db.collection(EModels.accounts);
        account.findOne({ nickname: "admin" }).then((candidate) => {
          if (candidate) {
            // logging
            logger.error(`Already created default account`);
            process.exit();
          } else {
            // find id
            let roleId = new Types.ObjectId(roledoc.insertedId);

            // admin account
            let passwordHash = bcrypt.hashSync(
              "adminZ132S$D",
              global.SALT_PASSWORD
            );
            let adminAccount: IAccount = {
              nickname: "admin",
              passwordHash,
              role: roleId,
              FIO: {
                firstName: "",
                middleName: "",
                lastName: "",
              },
              mail: "admin@gmail.com",
            };

            // insert
            account.insertOne(adminAccount);
            logger.info(`Created default account`);
            process.exit();
          }
        });
      } else {
        // admin role
        let adminRole: IRole = {
          name: "admin",
          isAdminFun: true,
          isOtherFun: false,
        };

        // insert
        role.insertOne(adminRole).then((roleDoc) => {
          // loging
          logger.info(`Created default role`);

          // create default account
          let account = conn.db.collection(EModels.accounts);
          account.findOne({ nickname: "admin" }).then((candidate) => {
            if (candidate) {
              // logging
              logger.error(`Already created default account`);
              process.exit();
            } else {
              // find id
              let roleId = new Types.ObjectId(roleDoc.insertedId);

              // admin account
              let passwordHash = bcrypt.hashSync(
                "adminZ132S$D",
                global.SALT_PASSWORD
              );
              let adminAccount: IAccount = {
                nickname: "admin",
                passwordHash,
                role: roleId,
                FIO: {
                  firstName: "",
                  middleName: "",
                  lastName: "",
                },
                mail: "admin@gmail.com",
              };

              // insert
              account.insertOne(adminAccount);
              logger.info(`Created default account`);
              process.exit();
            }
          });
        });
      }
    });
  });
});
