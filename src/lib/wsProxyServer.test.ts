import { WebSocketProxyServer } from "./wsProxyServer";
import WebSocket from "ws";
import http from "http";
import { AddressInfo } from "net";

describe("WebSocketProxy Proxies ws request", () => {
  let httpServer: http.Server;
  let port = 0;

  beforeAll((done) => {
    httpServer = http.createServer();
    httpServer.listen(0, () => {
      const address = httpServer.address() as AddressInfo;
      port = address.port;
      done();

    });
  });
  afterAll(() => {
    httpServer.close();
  });

  it("can construct websocket server", () => {
    const server = new WebSocketProxyServer({ server: httpServer });
    server.close();
  });

  it("can send and receive messages", async () => {
    const TEST_MESSAGE = "test-message";
    const server = new WebSocketProxyServer({ server: httpServer });

    await new Promise((resolve) => {
      server.on("connection", (socket) => {
        socket.on("message", (data) => {
          expect(data).toEqual(TEST_MESSAGE);
          socket.send(data);
        });
      });
      server.on("upgrade", () => {
        server.emit("upgraded", 1);
      });
      const ws = new WebSocket(`ws://localhost:${port}`, {
        origin: `http://localhost:${port}`,
      });
      ws.on("open", () => {
        ws.send(TEST_MESSAGE);
        ws.on("message", (data) => {
          expect(data).toEqual(TEST_MESSAGE);
          ws.close();
        });
        ws.on("close", () => {
          resolve();
        });
      });
    });
  });
});
