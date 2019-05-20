import { Installer} from "./installer";
import fs from "fs-extra";
import _ from "lodash";
import { Config } from "./config";
import { Repo } from "./repo";
import {getOS} from "./util";
import rimraf from "rimraf";
import {promisify} from "util";
const rmdir = promisify(rimraf);

describe("Installer ", () => {
  let repoDir: string;
  beforeEach(() => {
    repoDir = fs.mkdtempSync("test-repo");
  });
  afterEach(() => {
   rmdir(repoDir);
  });

  it("should construct an installation object", () => {
    const config = new Config({});
    const repo = new Repo(repoDir);
    // @ts-ignore
    new Installer(config, getOS(), repo);
  });

  it("should not install asset twice", () => {
  });

});
