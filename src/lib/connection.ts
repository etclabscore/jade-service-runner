import StrictEventEmitter from "strict-event-emitter-types/types/src";
import { EventEmitter } from "ws";
import { IncomingMessage } from "http";
import WebSocket from "ws";
import * as util from "./util";
import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http2";
import winston from "winston";
import * as jsonRpcErrors from "./jsonRpcError";

/**
 *  ResponseBus is a message queue used to process messages received from the backend service to the
 *  frontend proxy. It handles response, connection establishing, error, and terminated Connection events.
 */
export type ResponseBus<T extends DataResponse> = StrictEventEmitter<EventEmitter, ResponseEvents<T>>;
/**
 *  ConnectionBus is a message queue used to process messages generated from the main proxy service.
 *  It then creates frontend and backends on establish events. Forwards request to backends as specified by
 *  the routing logic.
 */
export type ConnectionBus = StrictEventEmitter<EventEmitter, ConnectionEvents>;

/**
 *  ResponseEvents are the specification for events corresponging to the ResponseBus
 *  typed for HttpResponseEvents or WSResponseEvents
 */
export interface ResponseEvents<T extends DataResponse> {
  "response": (data: T) => void;
  "established": (conn: Connection) => void;
  "error": (data: jsonRpcErrors.JSONRpcError) => void;
  "terminateConnection": (data: jsonRpcErrors.JSONRpcError) => void;
}

/**
 *  ConnectionEvents are the specification for events corresponding to the ConnectionBus
 *  **establish** corresponds to setting up a backend connection
 *  **request** corresponds to setting up a backend connection
 */
export interface ConnectionEvents {
  establish: (connection: ConnectionSpec) => void;
  request: (req: RequestSpec) => void;
  terminate: (connection: ConnectionSpec) => void;
}
/**
 * RequestSpec is a type specificication for data required for a request to a service
 */
export type RequestSpec = WSRequestSpec | HttpRequestSpec;

interface WSRequestSpec {
  payload: any;
  protocol: "ws";
  uri: string;
  conn: WebSocket;
}

interface HttpRequestSpec {
  payload: {
    headers: IncomingHttpHeaders,
    method: string,
    body: object,
  };
  protocol: "http";
  conn: HttpConnect;
  "uri": string;
}
/**
 *  DataResponse is the generic type for a response originating from a service
 */
export type DataResponse = HttpDataResponse | WSDataResponse;

/**
 * HttpDataResponse is used to relay http specific response information
 */
export interface HttpDataResponse {
  headers: OutgoingHttpHeaders;
  statusCode: number | undefined;
  reason: string | undefined;
  payload: any;
}
export interface WSDataResponse {
  payload: any;
}

/**
 * ConnectionSpec sets the expectations for Connection related data over the ConnectionBus
 */
export type ConnectionSpec = HttpConnectionSpec | WsConnectionSpec;

/**
 * HttpConnectionSpec http specific connection data
 */
export interface HttpConnectionSpec {
  "type": "http";
  "res": ResponseBus<HttpDataResponse>;
  "req": IncomingMessage;
}

/**
 * WSConnectionSpec websocket specific connection data
 */
export interface WsConnectionSpec {
  "type": "ws";
  "res": ResponseBus<WSDataResponse>;
  "req": IncomingMessage;
  "id": string;
}
/**
 * Connection is a generic Connection type describing connection behaviors
 */
export type Connection = WSConnection | HttpConnection;

/**
 * WSConnection is a websocket connection type
 */
export interface WSConnection {
  type: "ws";
  conn: WebSocket;
  host: "localhost";
}
/**
 * HttpConnection is a http connection type
 */
export interface HttpConnection {
  type: "http";
  conn: HttpConnect;
  host: "localhost";
}
/**
 * HttpConnect is a http connection used to relay http data
 */
export interface HttpConnect {
  send(data: any, headers: IncomingHttpHeaders, method: string): Promise<IncomingMessage>;
  respond(data: HttpDataResponse): void;
}
/**
 * ConnectionInfo is a high level connection description
 */
export interface ConnectionInfo {
  host: "localhost";
  port: number;
  protocol: util.Protocol;
}
/**
 * ConnectionInfo is a high level connection description
 */
export const connectionError = (message: string, id: number, reason: string, error: Error, logger: winston.Logger) => {
  logger.error(`message: ${message}, reason: ${reason}, stack: ${error.stack}`);
  return jsonRpcErrors.error(message, id, { reason });
};
