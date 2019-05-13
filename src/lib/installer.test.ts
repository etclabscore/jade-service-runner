import { downloadAsset} from './installer';
import net from 'net';
import { createServer } from 'http';
import http from 'http';
import crypto from 'crypto'
import fs from 'fs-extra';
import _ from 'lodash';

let testServer: http.Server;
let testBuffer: Buffer;
const TEST_DATA_DIR = './test-data'

beforeAll(async () => {
  testBuffer = crypto.randomBytes(200)
  return new Promise((resolve) => {
    testServer = createServer((req, res) => {
      if (!req.url) throw new Error("Request missing url")
      if (req.url.search("download") > 0) {
        res.writeHead(200, { 'Content-Type': 'application/binary' });
        res.write(testBuffer, 'binary')
        res.end();
        return
      }

      if (req.url.search("bad_response") > 0) {

      }

      if (req.url.search("timeout") > 0) {

      }
    })
    testServer.listen(0, resolve)
  })
})
afterAll((done) => {
  testServer.close(done)
})

describe("downloadAsset", () => {

  it("should download asset", async () => {
    const { port } = testServer.address() as net.AddressInfo;
    let url = `http://localhost:${port}/download.zip`;
    await downloadAsset(url, TEST_DATA_DIR, 'test.zip');
    expect(fs.existsSync(`${TEST_DATA_DIR}/test.zip`)).toBe(true)
    const content = fs.readFileSync(`${TEST_DATA_DIR}/test.zip`)
    expect(_.isEqual(testBuffer, content)).toBe(true);
  })

  it("should throw on failure", async () => {
  })
  it("should throw on timeout", async () => { })
})