import { EAPI } from "./enumApi";

exports.noVerify = {
  user: ["registration", "authorization", "registrationByCode"],
};

exports[EAPI.user] = require(`./${EAPI.user}`);
exports[EAPI.role] = require(`./${EAPI.role}`);
exports[EAPI.class] = require(`./${EAPI.class}`);
exports[EAPI.module] = require(`./${EAPI.module}`);
exports[EAPI.question] = require(`./${EAPI.question}`);
exports[EAPI.message] = require(`./${EAPI.message}`);
exports[EAPI.achievement] = require(`./${EAPI.achievement}`);
exports[EAPI.achievementAccount] = require(`./${EAPI.achievementAccount}`);
exports[EAPI.test] = require(`./${EAPI.test}`);
