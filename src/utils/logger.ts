import pino from "pino";
import dayjs from "dayjs";
import cluster from "cluster";

/**
 * logger pino
 */
export const logger = pino({
  transport: {
    target: "pino-pretty",
  },
  prettifier: true,
  base: {
    pid: false,
  },
  timestamp: () => `, "time":"${dayjs().format()}"`,
});

/**
 * logger worker (pid and id worker) pino
 */
export const loggerWorker = pino({
  transport: {
    target: "pino-pretty",
  },
  prettifier: true,
  base: {
    pid: process.pid + `, ${cluster.worker?.id}`,
  },
  timestamp: () => `, "time":"${dayjs().format()}"`,
});
