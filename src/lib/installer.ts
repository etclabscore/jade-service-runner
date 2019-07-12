/**
 * Installer - downloads and installs services on an OS basis to a repository
 */
import { Config, Service } from "./config";
import { OSTypes, downloadAsset } from "./util";
import { Repo } from "./repo";
import url from "url";

import { makeLogger } from "./logging";
import fs from "fs-extra";
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

  /**
   * Install service by service name and version
   * including downloading, extracting service assets
   * and adding the assets to the repository manifest
   *
   * @param serviceName - Name of the service
   * @param version - Version of the service
   */
  public async install(serviceName: string, version: string) {
    logger.info(`Installing: ${serviceName} - ${version}`);
    const serviceEntry = await this.repo.getServiceEntry(serviceName, version);
    if (serviceEntry) { return; }
    const service = this.config.getService(serviceName, this.os);
    const downloadPaths = await this.download(service);
    const path = await this.repo.addService(service, downloadPaths);
    logger.info(`Added and installed service(${serviceName}) to path: ${path}`);
  }

  /**
   * Downloads service assets
   *
   *
   * @param service -  Service configuration
   * @param version - Version of the service
   */
  public async download(service: Service): Promise<string[]> {
    return Promise.all(service.assets.map(async (asset) => {
      logger.debug(`Downloading ${asset}`);
      return downloadAsset(asset, this.repo.dir);
    }));
  }
}
