import pino from "pino";
import dayjs from "dayjs";

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
