import { ConnectionManager } from "./connectionManager";
import { ConnectionInfo } from "./connection";
import { Router } from "./router";
import WebSocket, { AddressInfo } from "ws";
import { MockWSDesc, mockWSServer } from "../../fixtures/src/util";
import { getAvailableTCPPort } from "./util";
import * as events from "./events";
import { EventEmitter } from "events";

describe("ConnectionManager tests", () => {

  let wsServiceServer: WebSocket.Server;
  let tcpPort: number;
  let backendClient: WebSocket;
  let wsDesc: MockWSDesc;
  let serviceNotifications: events.ExternalServiceNotifications;
  let connections: Set<ConnectionInfo>;
  let address;
  let serviceEvent: events.ExternalServiceNotification;

  beforeAll(async () => {
    wsDesc = await mockWSServer();
    wsServiceServer = wsDesc.wsServer;
    tcpPort = await getAvailableTCPPort();
    address = wsServiceServer.address() as AddressInfo;
    const location = `ws://localhost:${address.port}`;
    backendClient = new WebSocket(location);
    serviceNotifications = new EventEmitter();
    connections = new Set<ConnectionInfo>([{ host: "localhost", port: tcpPort, protocol: "ws" }]);
    serviceEvent = { env: "dev", name: "multi-geth", protocol: "ws", rpcPort: `${address.port}`, version: "1.0.0" };
  });

  it("should handle connection life cycle", (done) => {

    const TEST_MESSAGE = "test";
    const router = new Router(serviceNotifications);
    serviceNotifications.emit("launched", serviceEvent);
    const connMan = new ConnectionManager(connections, router);
    connMan.setupConnections();
    const location = `ws://localhost:${tcpPort}/multi-geth/dev/1.0.0`;
    const client = new WebSocket(location);
    client.on("open", async () => {
      client.send(TEST_MESSAGE);
      client.on("message", async (data) => {
        expect(data).toBe(TEST_MESSAGE);
        done();
      });
    });
    wsServiceServer.on("connection", (socket) => {
      socket.on("message", (data) => {
        expect(data).toBe(TEST_MESSAGE);
        socket.send(TEST_MESSAGE);
      });
    });
  });

});
