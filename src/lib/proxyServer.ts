import { ConnectionManager } from "./connectionManager";
import { ConnectionInfo } from "./connection";
import { Router } from "./router";
import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "ProxyServer");
/**
 * ProxyServer - the main class that establishes connection manager from arguments
 * and sets a router to be used for applying logic to route requests for services.
 * It is the wrapper for the connection manager and service runner. Right now it
 * supports "http" explicitly but only needs to handle adding support for ws , with a
 * port specification and easy commandline extension.
 */
export class ProxyServer {

  private connMan: ConnectionManager;
  private router: Router;
  constructor(base: Set<ConnectionInfo>, router: Router) {
    this.connMan = new ConnectionManager(base, router);
    this.router = router;
  }

  public start() {
    logger.debug("setting up connections");
    this.connMan.setupConnections();
    logger.debug("set up connections");
  }

  public addServiceRunner(port: number) {
    this.router.addServiceRoute("/", { host: "localhost", port, protocol: "http" });
  }
}
