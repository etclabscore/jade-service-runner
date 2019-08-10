import { methods, ServiceMethodMapping } from "./index";
import { Installer } from "../lib/installer";
import { Config, ServiceDesc, Service } from "../lib/config";
import { getOS } from "../lib/util";
import { Repo, IManifest } from "../lib/repo";
import { ServiceManager } from "../lib/serviceManager";
import _ from "lodash";
import { ENGINE_METHOD_DH } from "constants";
import { mockConfig } from "fixtures/src/util";
import { ActiveServiceSpec } from "../lib/service";
import { EventEmitter } from "events";
jest.mock("../lib/installer");
jest.mock("../lib/repo");
jest.mock("../lib/config");
jest.mock("../lib/ServiceManager");
describe("methods should reflect service runner api", () => {
  let installer: Installer;
  let serviceManager: ServiceManager;
  let meths: ServiceMethodMapping;
  type ServiceType = "available" | "running" | "installed";

  const generateService = (id: number, serviceType: ServiceType) => {
    return { name: `${id}`, environments: ["dev", "prod"], version: "foobar" };
  };

  const createTestSpecService = (name: string): ActiveServiceSpec => {

    return {
      args: {
        start: [],
        stop: [],
        teardown: [],
      },
      commands: {
        setup: [],
        start: "",
        stop: "",
        teardown: "",
      },
      env: "dev",
      name,
      notifications: new EventEmitter(),
      path: "",
      rpcPort: "9999",
      state: "running",
      version: "foobar",
    };
  };

  const createTestService = (name: string) => {
    return {
      assets: [],
      commands: {
        setup: [],
        start: "",
        stop: "",
        teardown: "",
      },
      environments: [{
        args: {
          start: [],
          stop: [],
          teardown: [],
        },
        name: "dev",
      }, {
        name: "prod",
        args: {
          start: [],
          stop: [],
          teardown: [],
        },
      }],
      name,
      rpcPort: "9999",
      version: "foobar",
    };

  };

  beforeAll(() => {
    installer = new Installer(new Config({}), getOS(), new Repo(""));
    serviceManager = new ServiceManager(new Repo(""), new Config({}));
    meths = methods(installer, serviceManager);

  });

  it("should install service", async () => {
    const mock = jest.fn();
    installer.install = mock;
    meths.installService("foobar", "dev");
    expect(mock.call.length).toBe(1);
  });

  it("should start service", async () => {
    const mock = jest.fn().mockReturnValue(createTestService("1000"));
    serviceManager.startService = mock;
    await meths.startService("foobar", "1000", "dev");
    expect(mock.call.length).toBe(1);
  });

  it("should list services", async () => {
    let testServices = [1, 2, 3].map((id) => generateService(id, "available"));
    const testSvc = _.cloneDeep(testServices);
    serviceManager.config.getAvailableServices = jest.fn((x: string): ServiceDesc[] => testSvc);

    let services = await meths.listServices("available");
    let exServices = testServices.map((s) => Object.assign(s, { state: "available" }));
    expect(_.isEqual(exServices, services));

    installer.repo = new Repo("");
    installer.repo.getManifest = jest.fn(async (): Promise<IManifest> => {
      return {
        version: "old",
        lastModified: "test",
        services: ["4", "5", "6"].map((name) => ({ name, version: "foobar", path: name })),
      };
    });
    testServices = [4, 5, 6].map((id) => generateService(id, "installed"));
    serviceManager.config.getService = jest.fn((name: string, os: string): Service => {
      return createTestService(name);
    });
    services = await meths.listServices("installed");
    exServices = testServices.map((s) => Object.assign(s, { state: "installed" }));

    expect(_.isEqual(exServices, services));
    serviceManager.listActiveServices = jest.fn((): ActiveServiceSpec[] => {
      return [4, 5, 6].map((name) => {
        return createTestSpecService(`${name}`);
      });
    });
    exServices = testServices.map((s) => Object.assign(s, { state: "running", environments: ["dev"] }));
    services = await meths.listServices("running");
    expect(_.isEqual(exServices, services));

    services = await meths.listServices("all");
    const names = services.map((service) => (service.name));
    expect(_.isEqual(names, [1, 2, 3, 4, 5, 6, 4, 5, 6].map((n) => `${n}`))).toBe(true);
  });

});
