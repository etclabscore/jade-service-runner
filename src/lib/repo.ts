/**
 * The Repo is a storage layer that specifies where, 
 * services are installed and keeps a record of the services and 
 * versions installed, by writing them to a manifest file 
 */
import fs, { ensureDirSync, ensureDir } from "fs-extra";
import { IService } from "./service";
import path from "path";
import { extractAsset } from "./util";
import mfSchema from "./service-runner-manifest-schema.json";
import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "Repo");

export const REPO_MANIFEST = "jade-service-runner-manifest.json";
import Ajv from "ajv";
const ajv = new Ajv();

interface IServiceEntry {
  name: string;
  version: string;
  path: string;

}
export interface IManifest {
  version: string;
  lastModified: string;
  services?: IServiceEntry[];
}

export class Repo {

  public dir: string;
  public path: string;
  constructor(dir: string) {
    this.dir = dir;
    this.path = `${dir}/${REPO_MANIFEST}`;
  }
  public async init() {
    ensureDirSync(this.dir);
    try {
      await fs.stat(this.path);
    } catch (e) {
      const manifest = { version: "0.0.1", lastModified: new Date().toISOString() } as IManifest;
      await fs.writeFile(this.path, JSON.stringify(manifest, null, 2));
      this.validateManifest(manifest);
    }
  }

  /**
   * Validates a manifest.
   *
   *
   * @param manifest - Name of the service 
   */
  public validateManifest(manifest: IManifest) {
    ajv.validate(mfSchema, manifest);
    if (ajv.errors && ajv.errors.length > 0) {
      logger.error(ajv.errors);
      throw new Error(`Manifest is corrupt`);
    }
  }

  /**
   * It writes a service to disk and to the manifest file.
   * It extracts the assets, places them into a services directory,
   * and writes the final location of the service to the manifest file.
   *
   * @param service - Service that contains the OS,env scoped service spec 
   * @param assetPaths - The paths where the dowloaded service assets are store 
   * @returns  
   */
  public async addService(service: IService, assetPaths: string[]): Promise<string> {
    const manifest = await this.getManifest();
    let exists;
    if (manifest.services) {
      logger.debug(`checking manifest for service: ${service.name}`);
      exists = manifest.services.find((svc) => {
        return svc.name === service.name && svc.version === service.version;
      });
    }
    if (exists) {
      logger.debug(`${service.name} already exists!`);
      return exists.path;
    }
    const servicePath = this.generateServicePath(service.name, service.version);

    const serviceEntry = { name: service.name, version: service.version, path: servicePath };
    manifest.services = manifest.services ? manifest.services.concat([serviceEntry]) : [serviceEntry];
    manifest.lastModified = new Date().toISOString();
    this.validateManifest(manifest);
    await ensureDir(path.dirname(servicePath));

    // Write service files to disk
    await Promise.all(assetPaths.map((asset) => {
      return extractAsset(asset, servicePath);
    }));

    // Write manifest entry to disk
    await fs.writeFile(this.path, JSON.stringify(manifest, null, 2));
    return servicePath;
  }

  /**
   * Checks for a service in the manifest file 
   *
   *
   * @param serviceName - Name of the service 
   * @param version - Version of the service 
   * @returns The manifest entry of the service 
   */
  public async getServiceEntry(serviceName: string, version: string): Promise<IServiceEntry | undefined> {
    const manifest = await this.getManifest();
    if (manifest.services === undefined) { return undefined; }
    const exists = manifest.services.find((service) => {
      return service.name === serviceName && service.version === version;
    });
    return exists;
  }
  /**
   *  /returns the manifest 
   *
   * @returns The manifest 
   */
  public async getManifest(): Promise<IManifest> {
    const mfFile = await fs.readFile(this.path);
    return JSON.parse(mfFile.toString("utf-8")) as IManifest;
  }

  private generateServicePath(serviceName: string, version?: string) {
    return `${this.dir}/${serviceName}/${version}`;
  }
}
