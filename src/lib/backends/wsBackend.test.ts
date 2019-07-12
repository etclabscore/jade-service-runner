import { wsBackend } from "./wsBackend";
import { mockWSServer } from "../../../fixtures/src/util";
import { AddressInfo } from "net";
import http from "http";
import { EventEmitter } from "events";

describe("Backend returns valid connecion", () => {
  let server: http.Server;
  beforeAll(async () => {
    const serverDesc = await mockWSServer();
    server = serverDesc.server;
  });

  afterAll((done) => {
    server.close(done);
  });

  it("establish backend", async () => {
    const { port } = server.address() as AddressInfo;
    const backend = await wsBackend({ host: "localhost", port, protocol: "ws" }, new EventEmitter());
    backend.conn.close();
    await new Promise((resolve) => {
      backend.conn.on("close", () => {
        resolve();
      });
    });
  });
});
