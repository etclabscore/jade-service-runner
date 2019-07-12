import { Repo, REPO_MANIFEST } from "./repo";
import fs, { stat, mkdtempSync } from "fs-extra";
import rimraf from "rimraf";
import { promisify } from "util";
import { Service } from "./config";
const rmdir = promisify(rimraf);
const mockService: Service = {
  name: "testService",
  version: "1.0.0",
  rpcPort: "8000",
  environments: [{
    name: "dev",
    args: {
      start: [],
      stop: [],
      teardown: [],
    },
  }],
  commands: {
    setup: [],
    start: "",
    stop: "",
    teardown: "",
  },
  assets: [""],
};

describe("repo services storage", () => {
  let repoDir: string;
  beforeEach(() => {
    repoDir = mkdtempSync("test-repo");
  });
  afterEach(async () => {
    await rmdir(repoDir);
  });
  it("should create a manifest file in directory upon init", async () => {
    const repo = new Repo(repoDir);
    await repo.init();
    await stat(`${repoDir}/${REPO_MANIFEST}`);
  });

  it("should add a service into manifest file and return writing path", async () => {
    const repo = new Repo(repoDir);
    await repo.init();
    const path = await repo.addService(mockService, ["fixtures/test-package.zip"]);
    await fs.stat(path);
    const mf = await repo.getManifest();

    expect(mf.services).toBeDefined();
    if (mf.services) {
      expect(mf.services.find((service) => service.name === "testService")).toBeDefined();
      expect(mf.services.find((service) => service.name === "testService"
        && service.version === "1.0.0")).toBeDefined();
    } else {
      throw new Error(`Service not written to manifest`);
    }
  });

  it("should throw on bad manifest", () => {

    const manifest: any = {
      lastModified: "something",
      services: [{
        name: "missing-path",
        version: "1.0.0",
      }],
    };
    const repo = new Repo(repoDir);
    repo.init();
    expect(() => repo.validateManifest(manifest)).toThrowError();
  });

});
