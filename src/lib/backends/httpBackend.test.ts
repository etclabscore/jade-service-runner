import { httpBackend } from "./httpBackend";
import { mockServer } from "../../../fixtures/src/util";
import { AddressInfo } from "net";
import http from "http";
import { EventEmitter } from "events";
describe("Backend returns valid connecion", () => {
  let server: http.Server;
  beforeAll(async () => {
    server = await mockServer("");
  });

  afterAll((done) => {
    server.close(done);
  });
  it("establish backend", async () => {
    const { port } = server.address() as AddressInfo;

    const backend = await httpBackend({ host: "localhost", port, protocol: "http" }, new EventEmitter());
    const response = await backend.conn.send({ data: "test" }, { path: "/" }, "POST");
    response.on("data", (data: any) => {
      const result = JSON.parse(data);
      expect(result.test).toEqual("payload");
    });
  });

});
