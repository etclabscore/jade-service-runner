import { Config } from "./config";
import defaultConfig from "../service-runner-config.json";
import _ from "lodash";
import { OSTypes } from "./util";

describe("configuration test", () => {

  const mockConfig = {
    services: [
      {
        name: "multi-geth",
        environments: [
          {
            name: "test-dev",
            args: {
              start: ["--datadir ${svc_runner_data_path}/multi-geth"],
              stop: [],
              teardown: [],
            },
          }],
      },
      {
        name: "eth-classic",
        environments: [
          {
            name: "dev",
            args: {
              start: ["--datadir ${svc_runner_data_path}/multi-geth"],
              stop: [],
              teardown: [],
            },
          }],
        os: {
          osx: {
            commands: {
              setup: [],
              start: "",
              stop: "",
              teardown: "",
            },
            assets: [],
          },
        },

      },
    ],
  };

  it("should construct valid configuration object", () => {
    new Config({}); // tslint:disable-line
  });

  it("should support valid config extension", () => {
    new Config(mockConfig); // tslint:disable-line
  });

  it("should retrieve service info", () => {
    const cfg = new Config(mockConfig);
    const svc = cfg.getService("multi-geth", "osx");
    expect(svc.name === "multi-geth").toBe(true);
    expect(svc.environments.find((env: any) => env.name === "test-dev"));
    const defaultService = defaultConfig.services.find((service: any) => service.name === "multi-geth") as any;
    expect(_.isEqual(svc.commands, defaultService.os.osx.commands)).toBe(true);
  });

  it("should throw on duplicate environment", () => {
    const badConfig = _.cloneDeep(mockConfig);
    badConfig.services.push(badConfig.services[0]);
    expect(() => new Config(badConfig)).toThrowError(/^.*already exists.*$/);
  });

  it("should throw on bad schema for new service", () => {
    const badConfig = _.cloneDeep(mockConfig);
    badConfig.services[0].name = "newService";
    expect(() => new Config(badConfig)).toThrowError(/^.*Bad Schema.*$/);
  });

  it("should throw on bad schema for existing service", () => {
    const badConfig = _.cloneDeep(mockConfig);
    // @ts-ignore
    badConfig.services[0].environments[0].name = undefined;
    expect(() => new Config(badConfig)).toThrowError(/^.*Bad Schema.*$/);
  });

  it("should retrieve installation information", () => {
    const config = new Config(mockConfig);
    const service = config.getService("multi-geth", OSTypes.OSX);
    expect(service.name === "multi-geth").toBe(true);
    expect(service.rpcPort).toEqual("${DYNAMIC_TCP_PORT_1}");
  });

  it("should properly default configure multi-geth", () => {
    const config = new Config({});
    const env = config.config.services[0].environments.find((e) => e.name === "mainnet");
    expect(env).toBeDefined();
  });

});
