import { mockConfig, mockServer } from "../../fixtures/src/util";
import { Config } from "./config";
import { Repo } from "./repo";
import fs from "fs-extra";
import rimraf from "rimraf";
import { promisify } from "util";
import { TaskManager } from "./task";
import { AddressInfo } from "net";
import http from "http";
import { IServiceConfig } from "./service";
import { getOS, OSTypes } from "./util";
import { Installer } from "./installer";
const rmDir = promisify(rimraf);
describe("TaskManager", () => {
  let repoDir: string;
  let server: http.Server;
  beforeAll(async () => {
    server = await mockServer("fixtures/testService.zip");
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    repoDir = fs.mkdtempSync("test-repo-task");
  });
  afterEach(async () => {
    await rmDir(repoDir);
  });
  it("should construct new TaskManager", async () => {
    const config: Config = new Config(mockConfig);
    const repo = new Repo(repoDir);
    await repo.init();
    new TaskManager(repo, config);
  });
  it("should start a service", async () => {
    // NOT temporarily disables this test for windows
    if (getOS() !== OSTypes.WINDOWS) {
      const config = new Config(mockConfig);
      const { port } = server.address() as AddressInfo;
      const svc = config.config.services.find((s: IServiceConfig) => s.name === "testService");
      if (svc === undefined) { throw new Error("could not find testService"); }
      const service = svc.os[getOS()];
      if (service === undefined) { throw new Error("could not find service for os"); }
      service.assets = [`http://localhost:${port}/download/testService.zip`];
      const repo = new Repo(repoDir);
      await repo.init();
      const installer = new Installer(config, getOS(), repo);
      const taskManager = new TaskManager(repo, config);
      await installer.install("testService", "1.0.0");
      const serviceConfig = await taskManager.startService("testService", "1.0.0", "test");
      expect(serviceConfig).toBeDefined();
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 3000);
      });
    }
  });
});
