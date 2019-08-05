import { EventEmitter } from "events";
import * as jsonRpcErrors from "./jsonRpcError";
import { backendRegistry } from "./backends";
import { frontendRegistry } from "./frontends";
import { Router } from "./router";
import { RequestSpec, ConnectionBus, Connection, ConnectionInfo, connectionError } from "./connection";
import { makeLogger } from "./logging";

const logger = makeLogger("ServiceRunner", "ConnectionManager");
/**
 * ConnectionManager - is a manager that manages incoming connections and helps route requests to the proper services
 * ### ConnectionManager Overview :
 *
 * #### Architecture
 * **Frontends** - are external ports used to connect to all services following a specific protocol
 * **Backends** - are internal client connections for json-rpc services
 * **ConnectionManager** - is a message queue that routes data about the connections between the frontend and backend
 * **Frontend**(external ports)> **ConnectionManager** -> **Backend**(connections to services) -> **Services**
 *
 * #### Initialization
 * **SetupAllFrontends** - setups external facing ports
 * **SetupListenersForBackends** - handle incoming request to point to specific services by creating new connections for those services
 * #### Request flow
 * **InitialIncomingRequest** => **Frontend** => **ConnectionManager** => **CreateBackend** => **RecieveRequest** => **ForwardToServiceUsingBackend**;
 */
export class ConnectionManager {
  private base: Set<ConnectionInfo>;
  private connectionBus: ConnectionBus;
  private router: Router;
  private teardown: Array<() => Promise<void>>;

  constructor(base: Set<ConnectionInfo>, router: Router) {
    this.base = base;
    this.connectionBus = new EventEmitter();
    this.router = router;
    this.teardown = [];
  }

  public setupConnections() {
    this.base.forEach((connectionInfo) => {
      const { protocol } = connectionInfo;
      const frontend = frontendRegistry.get(protocol);
      if (frontend === undefined) {
        throw new Error("Could not find protocol");
      }
      this.teardown.push(frontend(connectionInfo, this.connectionBus));
    });
    this.manageConnections();
  }

  /**
   * forwardRequest - routes all request
   * @param request - a connection obj that makes it possible forward both request and response
   */
  public async forwardRequest(request: RequestSpec) {
    switch (request.protocol) {
      case "ws":
        request.conn.send(request.payload);
        return;
      case "http":
        const response = await request.conn.send(request.payload.body, request.payload.headers, request.payload.method);
        const { statusCode, statusMessage, headers } = response;
        let payloadStr = "";
        response.on("data", (data) => {
         payloadStr += data.toString("utf-8");
        });
        response.on("end", () => {
          request.conn.respond({ headers, statusCode, reason: statusMessage, payload: payloadStr });
        });
        return;
    }
  }
  /**
   * manageConnections - setups backends aka new connections for incoming request and determines
   * if request to services are routeable, as well as setups request forwarding
   *  making it possible to potentially add permissions here based on routes or method routing
   */
  public manageConnections() {
    this.connectionBus.on("establish", async (connectionSpec) => {
      let routingInfo: ConnectionInfo;
      try {
        if (connectionSpec.req.url === undefined) {
          throw new Error("Could not resolve url");
        }
        routingInfo = this.router.resolve(connectionSpec.req.url);
      } catch (err) {
        const error = err as Error;
        const connectionErr = connectionError(jsonRpcErrors.METHOD_NOT_FOUND, 0, error.message, error, logger);
        connectionSpec.res.emit("terminateConnection", connectionErr);
        return;
      }

      let connection: Connection;
      switch (connectionSpec.type) {
        case "http":
          connection = await backendRegistry.http(routingInfo, connectionSpec.res);
          break;
        case "ws":
          connection = await backendRegistry.ws(routingInfo, connectionSpec.res);
          break;
        default:
          logger.error(`Could not resolve backend`);
          return;
      }
      connectionSpec.res.emit("established", connection);
    });

    this.connectionBus.on("request", (request) => {
      this.forwardRequest(request);
    });
  }

  public async cleanup() {
    return Promise.all(this.teardown.map((teardown) => {
      return teardown();
    }));
  }
}
