/**
 * Creates a logger scoped by service and context 
 */
import winston from "winston";
export const makeLogger = (service: string, context: string) => {
  return winston.createLogger({
    transports: new winston.transports.Console({ format: winston.format.simple() }),
    defaultMeta: { service, context },
    exitOnError: false,
  });
};
