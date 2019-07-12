import { mockWSServer } from "../../../fixtures/src/util";
import { AddressInfo } from "net";
import WebSocket from "ws";
import { ConnectionBus } from "../connection";
import { wsFrontend } from "./wsFrontend";
import { getAvailableTCPPort } from "../util";
import { EventEmitter } from "events";
import _ from "lodash";
import { MockWSDesc } from "fixtures/src/util";

describe("Frontend allows for a connection", () => {
  let wsServiceServer: WebSocket.Server;
  let tcpPort: number;
  let backendClient: WebSocket;
  let wsDesc: MockWSDesc;
  beforeAll(async () => {
    wsDesc = await mockWSServer();
    wsServiceServer = wsDesc.wsServer;
    tcpPort = await getAvailableTCPPort();
    const address = wsServiceServer.address() as AddressInfo;
    const location = `ws://localhost:${address.port}`;
    backendClient = new WebSocket(location);
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      wsServiceServer.close(() => {
        backendClient.on("close", () => {
          resolve();
        });
        wsDesc.server.close(() => {
          backendClient.close();
        });
      });
    });
  });

  it("should allow websocket client connection to reach established backend", async () => {
    const connectionBus: ConnectionBus = new EventEmitter();
    const ESTABLISH = 1;
    const REQUEST = 2;
    const RESPONSE = 3;
    const testSeq = [ESTABLISH, REQUEST, RESPONSE];
    const actualSeq: number[] = [];
    const testMessage = "TEST_MESSAGE";
    await new Promise((resolve) => {
      const teardown = wsFrontend({ host: "localhost", port: tcpPort, protocol: "ws" }, connectionBus);
      wsServiceServer.on("connection", (socket) => {
        socket.on("message", () => {
          socket.send(testMessage);
        });
        connectionBus.on("establish", (data) => {
          actualSeq.push(ESTABLISH);
          data.res.emit("established", { type: "ws", conn: backendClient, host: "localhost" });
        });
        connectionBus.on("request", (data) => {
          expect(data.payload).toEqual(testMessage);
          if (data.protocol === "ws") {
            data.conn.send(testMessage);
          }
          actualSeq.push(REQUEST);
        });
      });
      const client = new WebSocket(`ws://localhost:${tcpPort}`);
      client.on("open", () => {
        client.on("message", () => {
          actualSeq.push(RESPONSE);
          expect(_.isEqual(testSeq, actualSeq)).toBe(true);
          client.on("close", async () => {
            await teardown();
            resolve();
          });
          client.close();
        });
        client.send(testMessage);
      });
    });
  });

});
