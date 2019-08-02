import { Config } from "./config";
import { Repo } from "./repo";
import { Installer } from "./installer";
import { ServiceManager } from "./serviceManager";
import { getOS } from "./util";
import { Router, Server } from "@open-rpc/server-js";
import { OpenRPC } from "@open-rpc/meta-schema";
import { methods } from "../methods";
import cors from "cors";
import { json as jsonParser } from "body-parser";
import { HandleFunction } from "connect";

import openRPCDoc from "../../openrpc.json";
const openRPC = openRPCDoc as OpenRPC;
/**
 * ServiceRunnerServer - is an encapsulation of the core service runner functionality
 * It instantiates the service runner server. The service runner server itself is run
 * behind the ProxyServer, from the "/" route
 */
export class ServiceRunnerServer {

  public config: Config;
  public repo: Repo;
  public port: string;
  public installer: Installer;
  public serviceManager: ServiceManager;

  constructor(config: any, repoDir: string, port: string) {
    this.config = new Config(config);
    this.repo = new Repo(repoDir);
    this.installer = new Installer(this.config, getOS(), this.repo);
    this.serviceManager = new ServiceManager(this.repo, this.config);
    this.port = port;
  }

  /**
   * start - Launches the service runner
   */
  public async start() {
    await this.repo.init();
    const methodMapping = methods(this.installer, this.serviceManager);
    const router = new Router(openRPC, methodMapping);
    const options = {
      methodMapping,
      openrpcDocument: openRPC,
      router,
      transportConfigs: this.setupTransport(this.port),
    };
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
        port,
      },
    },
    ];
  }

}
