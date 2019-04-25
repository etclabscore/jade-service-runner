import { extractAsset, downloadAsset } from "./util";
import fs, { ensureDir } from "fs-extra";
import net from "net";
import { createServer } from "http";
import http from "http";
import crypto from "crypto";
import _ from "lodash";
import rimraf from "rimraf";
import { promisify } from "util";
const rmDir = promisify(rimraf);
const TEST_DATA_DIR = "./test-data";
describe("extract asset ", () => {
  let extractDir: string;

  const testExtraction = (path: string) => {

    let bufs = [];
    bufs = [
      fs.readFileSync(`${path}/package/test0.txt`),
      fs.readFileSync(`${path}/package/folder/test1.txt`),
    ];
    bufs.forEach((buf, idx) => {
      expect(buf.toString("utf-8") === `hello${idx}`).toBe(true);
    });
  };

  beforeEach(async () => {
    await fs.ensureDir(`${TEST_DATA_DIR}`);
    extractDir = await fs.mkdtemp(`${TEST_DATA_DIR}/test-extract`);
  });

  afterEach(async () => {
    await rmDir(TEST_DATA_DIR);
  });
  it("should extract zip file", async () => {
    const result = await extractAsset("fixtures/test-package.zip", extractDir);
    expect(result).toBe(true);
    testExtraction(extractDir);
  });

  it("should extract tar file", async () => {
    const result = await extractAsset("fixtures/test-package.tar", extractDir);
    expect(result).toBe(true);
    testExtraction(extractDir);
  });

  it("should extract tar.gz file", async () => {
    const result = await extractAsset("fixtures/test-package.tar.gz", extractDir);
    expect(result).toBe(true);
    testExtraction(extractDir);
  });

  it("should throw on unknown type", async () => {
    try {
      await extractAsset("fixtures/test-package.unreal", extractDir);
      throw new Error("test violation on unknown type");
    } catch (e) {
      expect(e.message).toContain("Unknown");
    }
  });
});

describe("downloadAsset", () => {
  let testServer: http.Server;
  let testBuffer: Buffer;
  let downloadDir: string;

  beforeAll(async () => {
    await fs.ensureDir(`${TEST_DATA_DIR}`);
    testBuffer = crypto.randomBytes(200);
    return new Promise((resolve) => {
      testServer = createServer((req, res) => {
        if (!req.url) { throw new Error("Request missing url"); }
        if (req.url.search("download") > 0) {
          res.writeHead(200, { "Content-Type": "application/binary" });
          res.write(testBuffer, "binary");
          res.end();
          return;
        }

        if (req.url.search("bad_response") > 0) {
          res.writeHead(400);
          res.write("Bad Response", "text");
          res.end();
          return;
        }

        if (req.url.search("timeout") > 0) {
          setTimeout(() => {
            res.writeHead(200);
            res.write("Should never see this", "text");
            res.end();
          }, 3000);

        }
      });
      testServer.listen(0, resolve);
    });
  });

  beforeEach(async () => {
    await ensureDir(`${TEST_DATA_DIR}`);
    downloadDir = await fs.mkdtemp(`${TEST_DATA_DIR}/test-download`);
  });

  afterAll((done) => {
    testServer.close(done);
  });

  afterAll(async () => {
    await rmDir(TEST_DATA_DIR);
  });

  it("should download asset", async () => {
    const { port } = testServer.address() as net.AddressInfo;
    const url = `http://localhost:${port}/download.zip`;
    await downloadAsset(url, downloadDir, "test.zip");
    expect(fs.existsSync(`${downloadDir}/test.zip`)).toBe(true);
    const content = fs.readFileSync(`${downloadDir}/test.zip`);
    expect(_.isEqual(testBuffer, content)).toBe(true);
  });

  it("should throw on failure", async () => {
    const { port } = testServer.address() as net.AddressInfo;
    const url = `http://localhost:${port}/bad_response.zip`;
    let res: string | undefined;
    try {
      res = await downloadAsset(url, downloadDir, "test.zip");
      throw new Error("test failure");
    } catch (e) {
      expect(e.message).toContain("Could not fetch");
      expect(res).toBeUndefined();
    }
  });

  it("should throw on timeout", async () => {
    const { port } = testServer.address() as net.AddressInfo;
    const url = `http://localhost:${port}/timeout.zip`;
    let res: string | undefined;
    try {
      res = await downloadAsset(url, downloadDir, "test.zip", 1000);
      throw new Error("test failure");
    } catch (e) {
      expect(e.message).toContain("Could not fetch");
      expect(res).toBeUndefined();
    }
  });

});
