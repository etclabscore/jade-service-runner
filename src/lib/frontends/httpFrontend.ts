import { Frontend } from "./types";
import http from "http";
import { HttpDataResponse, ResponseBus, ConnectionBus } from "../connection";
import { EventEmitter } from "events";
import connect, { HandleFunction } from "connect";
import { json as jsonParser } from "body-parser";
import { JSONRpcError, statusCode } from "../jsonRpcError";
import { makeLogger } from "../logging";
import cors = require("cors");
const logger = makeLogger("ServiceRunner", "httpFrontend");

const httpClientError = (jsonError: JSONRpcError, response: http.ServerResponse) => {
  response.setHeader("content-type", "application/json");
  response.writeHead(statusCode(jsonError.error.code));
  response.write(JSON.stringify(jsonError));
  response.end();
};
/**
 * httpProxy - proxies http request, binding request to an http server and forwarding request to underlying
 * services using the connectionBus
 * @param connectionBus - a message queue that provides information about incoming connections, and allows
 *  for forwarding request.
 */
const httpProxy = (connectionBus: ConnectionBus) => {
  return (req: any, response: http.ServerResponse) => {
    const responseBus: ResponseBus<HttpDataResponse> = new EventEmitter();

    responseBus.on("terminateConnection", (rpcError) => {
      httpClientError(rpcError, response);
    });

    responseBus.on("error", (rpcError) => {
      httpClientError(rpcError, response);
    });

    responseBus.on("established", async (backend) => {
      if (backend.type === "http") {
        logger.debug(`established http connection`);
        if (req.url === undefined) {
          response.writeHead(400);
          response.end(null);
          return;
        }
        const { headers, method, body } = req;
        logger.debug(`forwarding request ${headers} ${method} ${JSON.stringify(body)}`);
        connectionBus.emit("request", { payload: { headers, method, body }, protocol: "http", uri: req.url, conn: backend.conn });
      }
    });

    logger.debug(`Requesting connection be established`);
    connectionBus.emit("establish", { req, res: responseBus, type: "http" });

    responseBus.on("response", (data) => {
      logger.debug(`received response: ${JSON.stringify(data, null, 2)}`);
      const status = data.statusCode || 500;
      response.writeHead(status, data.reason, data.headers);
      response.write(data.payload);
      response.end(null);
    });
  };

};
/**
 * httpFronted - is a frontend used to receive all http request and forward them to backend services;
 * @param connectionInfo - dictates how the http server should accept connections
 * @param connectionBus - a channel/queue that allows for forwarding request, and receiving information about
 *  connections
 */
export const httpFrontend: Frontend = (connectionInfo, connectionBus) => {
  const app = connect();
  const corsOptions = { origin: "*" } as cors.CorsOptions;
  app.use(cors(corsOptions) as HandleFunction);
  app.use(jsonParser());
  app.use(httpProxy(connectionBus));
  const server = http.createServer(app);
  server.listen(connectionInfo.port);
  logger.debug(`listening on ${connectionInfo.port}`);
  const teardown = (): Promise<void> => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  };
  return teardown;
};
