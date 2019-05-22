import winston from "winston";
export const makeLogger = (service: string, context: string) => {
  return winston.createLogger({
    transports: winston.transports.Console,
    defaultMeta: { service, context },
    exitOnError: false,
  });
};
