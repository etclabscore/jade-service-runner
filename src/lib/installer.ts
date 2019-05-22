import { Config } from "./config";
import { OSTypes, downloadAsset } from "./util";
import { IService } from "./service";
import { Repo } from "./repo";
import url from "url";

import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "Installer");

export class Installer {

  public config: Config;
  public os: string;
  public repo: Repo;
  constructor(config: Config, os: OSTypes, repo: Repo) {
    this.config = config;
    this.os = os.toString();
    this.repo = repo;
  }

  public async install(serviceName: string, version: string) {
    logger.info(`Installing: ${serviceName} - ${version}`);
    const serviceEntry = await this.repo.getServiceEntry(serviceName, version);
    if (serviceEntry) { return; }
    const service = this.config.getService(serviceName, this.os);
    const downloadPaths = await this.download(service, version);
    const path = await this.repo.addService(service, downloadPaths);
    logger.info(`Added and installed service(${serviceName}) to path: ${path}`);
  }

  public async serviceExists(serviceName: string, version: string): Promise<IService | undefined> {
    try {
      return this.config.getService(serviceName, this.os);
    } catch (e) {
      return undefined;
    }
  }

  public async download(service: IService, version: string): Promise<string[]> {
    return Promise.all(service.assets.map((asset) => {
      const parsedUrl = url.parse(asset);
      if (parsedUrl === undefined || parsedUrl.pathname === undefined) {
        const err = new Error(`Could not parse download url`);
        logger.error(err);
        throw err;
      }
      const pathParts = parsedUrl.pathname.split("/");
      const tailPart = pathParts.pop();
      let fileName = "";
      if (tailPart) { fileName = tailPart; }
      logger.debug(`Downloading ${asset}`);
      return downloadAsset(asset, this.repo.dir, fileName);
    }));
  }
}
