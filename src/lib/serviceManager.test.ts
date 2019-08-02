import { mockConfig, mockServer } from "../../fixtures/src/util";
import { Config } from "./config";
import { Repo } from "./repo";
import fs from "fs-extra";
import rimraf from "rimraf";
import { promisify } from "util";
import { ServiceManager } from "./serviceManager";
import { AddressInfo } from "net";
import http from "http";
import { ActiveServiceSpec, ServiceNotificationEvents, ServiceSpec } from "./service";
import { Services } from "./config";
import { getOS, OSTypes } from "./util";
import * as util from "./util";
import { Installer } from "./installer";
import _ from "lodash";
import { ChildProcessWithoutNullStreams } from "child_process";
import { kill } from "process";
const rmDir = promisify(rimraf);
describe("ServiceManager", () => {
  let repoDir: string;
  let server: http.Server;
  interface TestServiceConfig {
    service: ActiveServiceSpec;
    serviceManager: ServiceManager;
  }
  type TransitionType = keyof ServiceNotificationEvents;
  interface LifeCyleTestType {
    state: TransitionType;
    service: ServiceSpec | ActiveServiceSpec;
  }

  const testLifeCycle = async (transitions: TransitionType[], service: ActiveServiceSpec) => {
    const log: LifeCyleTestType[] = [];
    await Promise.all(transitions.map((transition) => {
      return new Promise((resolve) => {
        service.notifications.once(transition, (svc: ServiceSpec | ActiveServiceSpec) => {
          log.push({ state: transition, service: _.cloneDeep(svc) });
          resolve();
        });
      });
    }));
    return log;
  };

  const createTestService = async (): Promise<TestServiceConfig> => {
    // NOTE temporarily disables this test for windows
    const config = new Config(mockConfig);
    const { port } = server.address() as AddressInfo;
    const svc = config.config.services.find((s: Services) => s.name === "testService");
    if (svc === undefined) { throw new Error("could not find testService"); }
    const service = svc.os[getOS()];
    if (service === undefined) { throw new Error("could not find service for os"); }
    service.assets = [`http://localhost:${port}/download/testService.zip`];
    const repo = new Repo(repoDir);
    await repo.init();
    const installer = new Installer(config, getOS(), repo);
    const serviceManager = new ServiceManager(repo, config);
    await installer.install("testService", "1.0.0");
    const serviceConfig = await serviceManager.startService("testService", "1.0.0", "test");
    expect(serviceConfig).toBeDefined();
    return { serviceManager, service: serviceConfig };
  };

  function* healthCheck(healthSeq: boolean[]) {
    for (const health of healthSeq) {
      yield Promise.resolve(health);
    }
    while (true) {
      yield Promise.resolve(true);
    }
  }
  beforeAll(async () => {
    server = await mockServer("fixtures/testService.zip");
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(async () => {
    repoDir = fs.mkdtempSync("test-repo-service");
  });
  afterEach(async () => {
    await rmDir(repoDir);
  });

  it("should construct new ServiceManager", async () => {
    const config: Config = new Config(mockConfig);
    const repo = new Repo(repoDir);
    await repo.init();
    new ServiceManager(repo, config);// tslint:disable-line 
  });

  it("should start and terminate a service", async () => {
    if (getOS() !== OSTypes.WINDOWS) {
      const healthSeq = [true];
      const hc = healthCheck(healthSeq);
      // being bad here and shimming the mock in
      // @ts-ignore
      util.isUp = jest.fn(() => hc.next().value);
      const serviceConfig = await createTestService();
      await new Promise((resolve) => {
        setTimeout(async () => {
          await serviceConfig.serviceManager.stopService("testService", "1.0.0", "test");
          resolve();
        }, 2000);
      });
    }
  });

  it("should execute service lifecycle if failure", async () => {
    if (getOS() !== OSTypes.WINDOWS) {
      const serviceConfig = await createTestService();
      const { service } = serviceConfig;
      const restartSeq: TransitionType[] = ["stopped", "pending", "launched"];
      // Note we must account for launch stability check
      const healthSeq = [true];
      const hc = healthCheck(healthSeq);

      // being bad here and shimming the mock in
      // @ts-ignore
      util.isUp = jest.fn(() => hc.next().value);
      const prom = testLifeCycle(restartSeq, service);
      await new Promise((resolve) => {
        setTimeout(async () => {
          const proc = service.process as ChildProcessWithoutNullStreams;
          // tslint:disable-next-line:no-console
          kill(proc.pid, "SIGTERM");
          const events = await prom;
          expect(_.isEqual(events.map((e) => e.state), restartSeq)).toBe(true);
          await serviceConfig.serviceManager.stopService("testService", "1.0.0", "test");
          resolve();
        }, 3000);
      });
    }
  }, 10000);

  it("should handle health check failure and reboot service", async () => {
    // The health check sequence should result in a successful run then failure and reboot

    const healthSeq = [true, true, true, false, false, true];
    const hc = healthCheck(healthSeq);
    // being bad here and shimming the mock in
    // @ts-ignore
    util.isUp = jest.fn(() => hc.next().value);
    if (getOS() !== OSTypes.WINDOWS) {
      const serviceConfig = await createTestService();
      const { service } = serviceConfig;
      const restartSeq: TransitionType[] = ["stopped", "pending", "launched"];
      const prom = testLifeCycle(restartSeq, service);
      await new Promise((resolve) => {
        setTimeout(async () => {
          const events = await prom;
          expect(_.isEqual(events.map((e) => e.state), restartSeq)).toBe(true);
          await serviceConfig.serviceManager.stopService("testService", "1.0.0", "test");
          resolve();
        }, 2000);
      });
    }
  }, 30000);
});
