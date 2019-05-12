import { downloadAsset, extractAsset } from './installer';
import net from 'net';
import { createServer } from 'http';
import http from 'http';
import { promisify } from 'util';
import crypto from 'crypto'
import fs, { rmdirSync, mkdirSync } from 'fs-extra';
import { ensureDirSync } from 'fs-extra'
import _ from 'lodash';
const mkdtemp = promisify(fs.mkdtemp);
const request = promisify(http.request);

let testServer: http.Server;
let testBuffer: Buffer;

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
    const path = await mkdtemp("test-")
    let url = `http://localhost:${port}/download.zip`;
    await downloadAsset(url, path, 'test.zip');
    expect(fs.existsSync(`${path}/test.zip`)).toBe(true)
    const content = fs.readFileSync(`${path}/test.zip`)
    expect(_.isEqual(testBuffer, content)).toBe(true);
  })

  it("should throw on failure", async () => {
  })
  it("should throw on timeout", async () => { })
})


describe("extractAsset", () => {
  let extractDir: string;

  const testExtraction = (path: string) => {

    let bufs = []
    bufs = [
      fs.readFileSync(`${path}/package/test0.txt`),
      fs.readFileSync(`${path}/package/folder/test1.txt`)
    ]
    bufs.forEach((buf, idx) => {
      expect(buf.toString('utf-8') === `hello${idx}`).toBe(true);
    });
  }


  beforeEach(async () => {
    await ensureDirSync('./test-data')
    extractDir = await mkdtemp('./test-data/test-extract');
  })
  afterEach(() => {
    fs.removeSync(`./test-data`)
  })

  it("should extract zip file", async () => {
    const result = await extractAsset('fixtures/test-package.zip', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should extract tar file", async () => {
    const result = await extractAsset('fixtures/test-package.tar', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should extract tar.gz file", async () => {
    const result = await extractAsset('fixtures/test-package.tar.gz', extractDir)
    expect(result).toBe(true)
    testExtraction(extractDir)
  })

  it("should throw on unknown type", async () => {

  })


})