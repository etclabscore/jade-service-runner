import WebSocket from "ws";
import { WSDataResponse, WSConnection, ConnectionInfo, ResponseBus, connectionError } from "../connection";
import { makeLogger } from "../logging";
import * as jsonRpcErrors from "../jsonRpcError";
const logger = makeLogger("ServiceRunner", "WSbackend");
/**
 * wsBackend is a connection made between a service and the proxy server, it returns a connection
 * for receiving and sending data to an underlying service.
 * @param connectionInfo - specifies how to connect to underlying service
 * @param response - a channel for recieving responses outside of the behavior
 *
 */
export const wsBackend = async (connectionInfo: ConnectionInfo, response: ResponseBus<WSDataResponse>): Promise<WSConnection> => {
  return new Promise((resolve) => {
    const { host, port } = connectionInfo;
    const connection = new WebSocket(`ws://${host}:${port}`);
    connection.on("error", (error: Error) => {
      // NOTE id cannot be null due to client bug
      response.emit("error", connectionError(jsonRpcErrors.GATEWAY_ERROR, 0, "Websocket Error", error, logger));
    });
    connection.on("open", () => {
      resolve({ ...connectionInfo, type: "ws", conn: connection });
    });
  });
};
