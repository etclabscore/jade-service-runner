import { Installer } from "./installer";
import fs from "fs-extra";
import _ from "lodash";
import { Config } from "./config";
import { Repo } from "./repo";
import { downloadAsset } from "./util";

const { getOS } = jest.requireActual('./util')
jest.mock('./util')

import rimraf from "rimraf";
import { promisify } from "util";
import { IService } from "./service";
const rmdir = promisify(rimraf);


describe("Installer ", () => {
  let repoDir: string;
  let repo: Repo;
  const mockService: IService = {
    name: "mock",
    rpcPort: "80",
    version: "1.0.0",
    environments: [{
      "name": "test",
      "args": {
        "start": ["bin/sh"],
        "stop": ["bin/stop"],
        "teardown": []
      }
    }],
    commands: {
      setup: [],
      start: "",
      stop: "",
      teardown: "",
    },
    assets: ["http://localhost:80/test.zip"]
  }
  beforeEach(async () => {
    repoDir = fs.mkdtempSync("test-repo");
    repo = new Repo(repoDir);
    await repo.init()
  });
  afterEach(async () => {
    await rmdir(repoDir);
  });

  it("should construct an installation object", () => {
    const config = new Config({});
    // @ts-ignore
    new Installer(config, getOS(), repo);
  });

  it("should not install asset twice", async () => {

    const config = new Config({});
    const getServiceEntry = jest.fn();
    getServiceEntry.mockResolvedValue("dummyResult")
    repo.getServiceEntry = getServiceEntry
    const installer = new Installer(config, getOS(), repo);
    await installer.install('testService', '1.0.0')
    expect(getServiceEntry).toBeCalledWith("testService", "1.0.0")
  });

  it("should install asset", async () => {
    const config = new Config({});
    config.getService = jest.fn().mockReturnValue(mockService)
    //@ts-ignore
    downloadAsset.mockReturnValue("/test/download/path")
    const addService = jest.fn().mockResolvedValue("/service/path")
    repo.addService = addService;
    const installer = new Installer(config, getOS(), repo);
    await installer.install('testService', '1.0.0')
    expect(addService).toBeCalledWith(mockService, ["/test/download/path"])
  })

});
