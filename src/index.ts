import { Config } from './lib/config'
import { Repo } from './lib/repo';
import { Installer } from './lib/installer'
import {TaskManager} from './lib/task'
import { getOS } from './lib/util';
import { Router, Server } from "@open-rpc/server-js";
import { OpenRPC } from "@open-rpc/meta-schema";
import {methods} from './methods';
import cors from "cors";
import { json as jsonParser } from "body-parser";
import { HandleFunction} from "connect";

import openRPCDoc from "../openrpc.json"  // tslint:disable-line
const openRPC = openRPCDoc as OpenRPC;
export class ServiceRunnerServer {

  config: Config;
  repo: Repo;
  port: string;
  installer: Installer;
  taskManager: TaskManager;

  constructor(config: any, repoDir: string, port: string) {
    this.config = new Config(config);
    this.repo = new Repo(repoDir);
    this.installer = new Installer(this.config, getOS(), this.repo);
    this.taskManager = new TaskManager(this.repo, this.config);
    this.port = port;
  }

  async start() {
    await this.repo.init() 
    const methodMapping = methods(this.installer, this.taskManager)
    const router = new Router(openRPC, methodMapping);
    const options = {
      router,
      methodMapping,
      transportConfigs:this.setupTransport(this.port),
      openrpcDocument: openRPC
    }
    const server = new Server(options);
    server.start();
  }

  private setupTransport(port: string = "8002"): any {
    const corsOptions = { origin: "*" } as cors.CorsOptions;
    return [{
      type: "HTTPTransport", options: {
        middleware: [
          cors(corsOptions) as HandleFunction,
          jsonParser(),
        ],
        port
      }
    },
    ]
  }

}