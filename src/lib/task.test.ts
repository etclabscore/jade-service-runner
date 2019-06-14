import { mockConfig, mockServer } from "../../fixtures/src/util";
import { Config } from "./config";
import { Repo } from "./repo";
import fs from "fs-extra";
import rimraf from "rimraf";
import { promisify } from "util";
import { TaskManager } from "./task";
import { AddressInfo } from "net";
import http from "http";
import { IServiceConfig, ActiveTaskService, TaskNotificationEvents, ITaskService } from "./service";
import { getOS, OSTypes } from "./util";
import * as util from "./util";
import { Installer } from "./installer";
import _ from "lodash";
import { ChildProcessWithoutNullStreams } from "child_process";
import { kill } from "process";
const rmDir = promisify(rimraf);
describe("TaskManager", () => {
  let repoDir: string;
  let server: http.Server;
  interface TestServiceConfig {
    service: ActiveTaskService;
    taskManager: TaskManager;
  }
  type TransitionType  = keyof TaskNotificationEvents;
  interface LifeCyleTestType {
    state: TransitionType;
    service: ITaskService | ActiveTaskService;
  }

  const testLifeCycle = async (transitions: TransitionType[], service: ActiveTaskService) => {
    const log: LifeCyleTestType[] = [];
    await Promise.all(transitions.map((transition) => {
      return new Promise((resolve) => {
        service.notifications.once(transition, (svc: ITaskService | ActiveTaskService) => {
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
    return { taskManager, service: serviceConfig };
  };

  const healthSeq = [true, true, false, false, true];
  function* healthCheck() {
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
    repoDir = fs.mkdtempSync("test-repo-task");
  });
  afterEach(async () => {
    await rmDir(repoDir);
  });

  it("should construct new TaskManager", async () => {
    const config: Config = new Config(mockConfig);
    const repo = new Repo(repoDir);
    await repo.init();
    new TaskManager(repo, config);// tslint:disable-line 
  });

  it("should start and terminate a service", async () => {
    if (getOS() !== OSTypes.WINDOWS) {
      const serviceConfig = await createTestService();
      await new Promise((resolve) => {
        setTimeout(async () => {
          await serviceConfig.taskManager.stopService("testService", "1.0.0", "test");
          resolve();
        }, 2000);
      });
    }
  });

  it("should execute task lifecycle if failure", async () => {
    if (getOS() !== OSTypes.WINDOWS) {
      const serviceConfig = await createTestService();
      const { service } = serviceConfig;
      const restartSeq: TransitionType[] = ["stopped", "pending", "launched"];
      const prom = testLifeCycle(restartSeq, service);
      await new Promise((resolve) => {
        setTimeout(async () => {
           const proc = service.process as ChildProcessWithoutNullStreams;
           kill(proc.pid, "SIGTERM");
           const events = await prom;
           expect(_.isEqual(events.map((e) => e.state), restartSeq)).toBe(true);
           await serviceConfig.taskManager.stopService("testService", "1.0.0", "test");
           resolve();
        }, 2000);
      });
    }
  }, 10000);

  it("should handle health check failure and reboot service", async () => {
    // The health check sequence should result in a successful run then failure and reboot
    const hc = healthCheck();
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
           await serviceConfig.taskManager.stopService("testService", "1.0.0", "test");
           resolve();
        }, 2000);
      });
    }
  }, 10000);
});
