import { mockServer } from "../../../fixtures/src/util";
import { AddressInfo } from "net";
import http from "http";
import { HttpConnection, ConnectionBus, ResponseBus } from "../connection";
import { httpFrontend } from "./httpFrontend";
import { getAvailableTCPPort } from "../util";
import { EventEmitter } from "events";
import _ from "lodash";
import { httpBackend } from "../backends/httpBackend";
import fetch from "node-fetch";
import { HttpDataResponse } from "../connection";

describe("Frontend allows for a connection", () => {
  let httpServiceServer: http.Server;
  let tcpPort: number;
  beforeAll(async () => {
    httpServiceServer = await mockServer("");
    tcpPort = await getAvailableTCPPort();
  });

  afterAll(async () => {
    await new Promise((resolve) => {
      httpServiceServer.close(() => resolve());
    });
  });

  it("should allow http client connection to reach established backend", async () => {

    const address = httpServiceServer.address() as AddressInfo;
    const location = `http://localhost:${address.port}`;
    const connectionBus: ConnectionBus = new EventEmitter();
    const ESTABLISH = 1;
    const REQUEST = 2;
    const actualSeq: number[] = [];
    let backendClient: HttpConnection;
    let connResponse: ResponseBus<HttpDataResponse>;
    await new Promise(async (resolve) => {
      const teardown = httpFrontend({ host: "localhost", port: tcpPort, protocol: "http" }, connectionBus);
      connectionBus.on("establish", async (data) => {
        actualSeq.push(ESTABLISH);
        connResponse = data.res;
        backendClient = await httpBackend({ protocol: "http", host: "localhost", port: address.port }, data.res);
        connResponse.emit("established", { type: "http", conn: backendClient.conn, host: "localhost" });
      });
      connectionBus.on("request", async (data) => {
        actualSeq.push(REQUEST);
        if (data.protocol === "http") {
          const res = await backendClient.conn.send(data.payload.body, data.payload.headers, data.payload.method);
          res.on("data", (d) => {
            const { statusCode, headers } = res;
            connResponse.emit("response", { headers, reason: "testreason", statusCode, payload: d });
          });
        }
      });
      const result = await fetch(`http://localhost:${tcpPort}/`, {
        headers: {
          path: "/",
        },
        method: "POST",
        body: JSON.stringify({ test: "payload" }),
      });
      const r = await result.json();
      expect(result.status).toEqual(200);
      expect(result.statusText).toEqual("testreason");
      expect(r.test).toEqual("payload");
      resolve();
    });
  });
});
