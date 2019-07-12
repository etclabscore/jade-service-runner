import { Frontend } from "./types";
import http, { Server, IncomingMessage } from "http";
import net from "net";
import { WebSocketProxyServer } from "../wsProxyServer";
import { WSDataResponse, ResponseBus } from "../connection";
import { EventEmitter } from "events";
import WebSocket from "ws";
/**
 *
 * wsFrontend - is the external facing entry to connect to all websocket based services
 * @param connectionInfo - specifies how the external facing websocket server should be setup
 * @param connectionBus - a channel/queue that routes information about the status of incoming connections,
 * and allows request to be forwarded to backend services
 */
export const wsFrontend: Frontend = (connectionInfo, connectionBus) => {

  // setup the websocket server with additional handling
  const server = http.createServer();
  const wss = new WebSocketProxyServer({ server: server as Server });

  // handle the upgrade event to start process for underlying service
  wss.on("upgrade", (request, socket, socketID) => {
    const response: ResponseBus<WSDataResponse> = new EventEmitter();
    // if the error happens attempting to connect to the service

    response.on("terminateConnection", (error) => {
      wss.emit("terminateConnection", error);
    });

    response.on("established", (backend) => {
      wss.emit("upgraded", socketID, backend.conn);
    });
    // signal to the connection manager, to open a new connection to underlying service
    connectionBus.emit("establish", { req: request, res: response, type: "ws", id: socketID });
  });

  // Once the external service connection has been establish start accepting connections
  wss.on("connection", (socket: WebSocket, request: IncomingMessage, socketID: string, backend: WebSocket) => {

    backend.on("error", (data) => {
      socket.emit("error", data);
    });

    backend.on("close", () => {
      socket.close();
    });

    backend.on("message", (data) => {
      socket.send(data);
    });

    socket.on("message", (data: any) => {
      if (request.url === undefined) {
        return;
      }
      connectionBus.emit("request", { payload: data, protocol: "ws", uri: request.url, conn: backend });
    });

  });
  server.listen(connectionInfo.port);
  const teardown = (): Promise<void> => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  };

  return teardown;
};
