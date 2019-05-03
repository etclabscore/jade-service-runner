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
//@ts-ignore
const serviceHelper = require('service-helper');
const readFile = promisify(fs.readFile);
import * as path from 'path';
var appDir = path.resolve(__dirname);
const client: ServiceRunner = new ServiceRunner({transport: {type:"http"}})

  
async function foo() {

} 

const corsOptions = { origin: "*" } as cors.CorsOptions;
const methodHandlerMapping: IMethodMapping = {
  installService: async (name: string, version: string) => {
    //TODO would normally go through some config to resolve the name from a registry
    const mgeth_url = "https://github.com/multi-geth/multi-geth/releases/download/v1.8.27/multi-geth-osx.zip"    
    try {
    console.log('installing service')
    await serviceHelper.installService(name, mgeth_url);
    console.log('installed service')
    return true 
    }catch(e) {
      console.log(e);
    }
    return false
  },
  startService: async (name: string, env: string) => {
    console.log('starting service');
    const config = await serviceHelper.startService(name,env);
    console.log('started service');
    return config
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
