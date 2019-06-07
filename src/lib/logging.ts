/**
 * Creates a logger scoped by service and context
 */
import winston from "winston";
const LOG_LEVEL = process.env.JADE_DEBUG ? "debug" : "info";
export const makeLogger = (service: string, context: string) => {
  return winston.createLogger({
    transports: new winston.transports.Console({ level: LOG_LEVEL, format: winston.format.simple() }),
    defaultMeta: { service, context },
    exitOnError: false,
  });
};
