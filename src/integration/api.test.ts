import { startServiceRunner } from "..";
import { getAvailableTCPPort, getOS, OSTypes } from "../lib/util";
import { simpleMathConfig } from "../../fixtures/src/testService/extended_config";
import path from "path";
import yazl from "yazl";
import fs from "fs-extra";
import rmdir from "rimraf";
import { ConnectionInfo } from "../lib/connection";
import { SimpleMath } from "../../fixtures/src/testService/client";
import { ServiceRunnerServer } from "../lib/serviceRunnerServer";

if (getOS() !== OSTypes.WINDOWS) {
  describe("API integration Test", () => {
    let tcpPort: number;
    let wsPort: number;
    let dirAssets: string;
    let repoDir: string;
    let serviceRunner: ServiceRunnerServer;
    beforeAll(async () => {
      tcpPort = await getAvailableTCPPort();
      wsPort = await getAvailableTCPPort();
      const connections = new Set<ConnectionInfo>([{
        host: "localhost",
        port: tcpPort,
        protocol: "http",
      },
      {
        host: "localhost",
        port: wsPort,
        protocol: "ws",
      },
      ]);
      repoDir = path.resolve(await fs.mkdtemp("../test-repo"));
      dirAssets = path.resolve(`${__dirname}/../../test-repo-assets`);
      dirAssets = path.resolve(await fs.mkdtemp(dirAssets));

      const testAssetPath = path.resolve(__dirname, "../../build/dist"); // /fixtures/src/testService/index.js");
      await new Promise((resolve) => {
        const zipfile = new yazl.ZipFile();
        zipfile.outputStream.on("end", () => resolve());
        const walkFS = (filePath: string) => {
          const files = fs.readdirSync(filePath);
          files.forEach((file) => {
            const fullPath = path.join(filePath, file);
            if (!fs.statSync(fullPath).isDirectory()) {
              zipfile.addFile(fullPath, file, { mode: parseInt("040775", 8) });
            } else {
              walkFS(fullPath);
            }
          });
        };
        walkFS(testAssetPath);
        // pipe() can be called any time after the constructor
        zipfile.outputStream.pipe(fs.createWriteStream(`${dirAssets}/testService.zip`));
        zipfile.end();
        // tslint:disable-next-line:no-console
      });
      serviceRunner = await startServiceRunner(connections, repoDir, simpleMathConfig(dirAssets));
    });

    afterAll(() => {
      rmdir.sync(dirAssets);
      //    rmdir.sync(repoDir);
    });

    it("should return a result with http connection", async () => {
      await serviceRunner.installer.install("simple-math", "1.0.0");
      await serviceRunner.serviceManager.startService("simple-math", "1.0.0", "http");
      const sm = new SimpleMath({
        transport: {
          host: "localhost",
          port: tcpPort,
          type: "http",
          path: "/simple-math/http/1.0.0",
        },
      });
      const result = await sm.addition(2, 2);
      expect(result).toEqual(4);
    }, 10000);

    it("should return an error with http connection", async () => {
      await serviceRunner.installer.install("simple-math", "1.0.0");
      const spec = await serviceRunner.serviceManager.startService("simple-math", "1.0.0", "http");
      const sm = new SimpleMath({
        transport: {
          host: "localhost",
          port: tcpPort,
          type: "http",
          path: "/simple-math/http/Z.0.0",
        },
      });
      try {
        await sm.addition(2, 2);
      } catch (e) {
        expect(e.code).toEqual(-32601);
      }
    }, 10000);

    // NOTE test is not accurate needs clientjs to implement onclose and onerror
    it("should return an error with ws connection", async () => {
      await serviceRunner.installer.install("simple-math", "1.0.0");
      const spec = await serviceRunner.serviceManager.startService("simple-math", "1.0.0", "ws");
      const sm = new SimpleMath({
        transport: {
          host: "localhost",
          port: wsPort,
          type: "websocket",
          path: "/simple-math/ws/Z.0.0",
        },
      });
      await sm.transport.connect();
    }, 10000);

    it("should return a result with ws connection", async () => {
      await serviceRunner.installer.install("simple-math", "1.0.0");
      const spec = await serviceRunner.serviceManager.startService("simple-math", "1.0.0", "ws");
      const sm = new SimpleMath({
        transport: {
          host: "localhost",
          port: wsPort,
          type: "websocket",
          path: "/simple-math/ws/1.0.0",
        },
      });
      await sm.transport.connect();
      const complete = new Promise((resolve) => {
        sm.transport.onData((response) => {
          const { result } = JSON.parse(response);
          expect(result).toEqual(4);
          resolve();
        });
      });
      await sm.addition(2, 2);
      await complete;
    }, 10000);

  });

}
