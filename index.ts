import { Router, Server} from "@open-rpc/server-js";

import ServiceRunner from "jade-service-runner-package";
import { OpenRPC } from "@open-rpc/meta-schema";
import { IMethodMapping } from "@open-rpc/server-js/build/router";
import {HandleFunction, NextFunction } from "connect";
import * as http from "http";
import cors from "cors";
import { json as jsonParser } from "body-parser";
import { promisify } from "util";
import * as fs from "fs";
const readFile = promisify(fs.readFile);
import * as path from 'path';
var appDir = path.resolve(__dirname);
const client: ServiceRunner = new ServiceRunner({transport: {type:"http"}})

  
async function foo() {

} 

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
async function init(){
  let doc: OpenRPC;
  console.log(appDir + 'openrpc.json')
  const data = await readFile(appDir + '/../openrpc.json')
  doc = JSON.parse(data.toString());
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
}

try {
  init()
} catch (e) {
  console.log(e)
}