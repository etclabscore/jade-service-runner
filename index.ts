import { Router, Server} from "@open-rpc/server-js";

import ServiceRunner from "jade-service-runner-package";
import { OpenRPC } from "@open-rpc/meta-schema";
import { IMethodMapping } from "@open-rpc/server-js/build/router";
import {HandleFunction, NextFunction } from "connect";
import * as http from "http";
import cors from "cors";
import { json as jsonParser } from "body-parser";

const client: ServiceRunner = new ServiceRunner({transport: {type:"http"}})
const doc: OpenRPC= client["openrpcDocument"]
const corsOptions = { origin: "*" } as cors.CorsOptions;



const methodHandlerMapping: IMethodMapping = {
  installService: async (a, b) => {
    console.log('installedService')
    return false
  }
}

const validateMethods = (method: string) => {
  if( typeof (client as any)[method] === "function") return  
  throw "Invalid method for router"
}
Object.keys(methodHandlerMapping).forEach(validateMethods)
const router = new Router(doc, methodHandlerMapping);
router.isMethodImplemented

const options = {
  router: router,
  methodMapping: methodHandlerMapping,
  transportConfigs: [
    {
      type: "HTTPTransport", options: { middleware: [
        cors(corsOptions) as HandleFunction,
        jsonParser(),
      ],
       port: "8002" } },
  ],
  openrpcDocument: doc 
};

      // @ts-ignore
const server = new Server(options);

server.start();