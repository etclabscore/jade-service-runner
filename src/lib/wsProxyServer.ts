import WebSocket from "ws";
import http, { IncomingMessage } from "http";
import https from "https";
import { Socket } from "net";
import { EventEmitter } from "events";
import { makeLogger } from "./logging";
import { JSONRpcError } from "./jsonRpcError";
const logger = makeLogger("ServiceRunner", "WebSocketProxyServer");

interface ServerReq {
  server: http.Server | https.Server;
}

type ServerOptions = WebSocket.ServerOptions & ServerReq;

/**
 * WebSocketProxyServer - extends websocket server to support a pattern for dynamically creating a connection
 * to a 3rd different server
 * ### Initialization Lifecycle
 * **websocket conn upgrade** => **emit custom upgrade**
 * => **frontend emit established** => **backend is created and returned** => **frontend emits upgraded**
 * => **proxy server accepts upgrade request** => **emits connection with backend to connect to**
 * => **backend used for communication**
 * ### Bad initial request lifecycle (bad path or unknown error)
 *  **connection manager issues temrinatecConnection** => **initial connection is accepted**
 *  => **immediately closed with a reason**
 */
export class WebSocketProxyServer extends WebSocket.Server {

  private socketID: number;
  constructor(options: ServerOptions, callback?: () => void) {
    super(options, callback);
    this.socketID = 0;
    // @ts-ignore
    this._removeListeners();
    // @ts-ignore
    this._removeListeners = addListeners(this._server, {
      listening: this.emit.bind(this, "listening"),
      error: this.emit.bind(this, "error"),
      upgrade: (req: IncomingMessage, socket: Socket, head: Buffer) => {
        this.socketID++;
        this.once("terminateConnection", (err: JSONRpcError) => {
          this.handleUpgrade(req, socket, head, (ws) => {
            logger.error(`terminating connection early`);
            ws.close(4000, err.error.message);
          });
        });
        this.once("upgraded", (socketID, backend) => {
          this.handleUpgrade(req, socket, head, (ws) => {
            // NOTE potential issue here if there is a delay in binding the listeners for the websocket
            this.emit("connection", ws, req, socketID, backend);
          });
        });
        this.emit("upgrade", req, socket, this.socketID);
      },
    });
  }
}
/**
 * Add event listeners on an `EventEmitter` using a map of <event, listener>
 * pairs.
 *
 * @param {EventEmitter} server The event emitter
 * @param {Object.<String, Function>} map The listeners to add
 * @return {Function} A function that will remove the added listeners when called
 * @private
 */
function addListeners(server: EventEmitter, map: { [index: string]: any }) {
  for (const event of Object.keys(map)) { server.on(event, map[event]); }

  return function removeListeners() {
    for (const event of Object.keys(map)) {
      server.removeListener(event, map[event]);
    }
  };
}
