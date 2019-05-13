import {Config} from './config';
import {OSTypes, downloadAsset} from './util';
import {IService} from './service';
import {Repo} from './repo';
import url from 'url';

export class Installer {

  config:Config;
  os:string;
  repo:Repo;
  constructor(config: Config, os:OSTypes, repo:Repo) {
    this.config = config
    this.os = os.toString();
    this.repo = repo
  }

  async install(serviceName: string, version?: string) {
    const serviceEntry = await this.repo.getServiceEntry(serviceName, version)
    if(serviceEntry) return
    const service = this.config.getService(serviceName, this.os);
    const downloadPaths = await this.download(service, version)
    const path = await this.repo.addService(service,downloadPaths)
    console.info(`Added and installed service(${serviceName}) to path: ${path}`)
  }

  async serviceExists(serviceName: string, version?: string): Promise<IService | undefined> {
    try {
      const service = this.config.getService(serviceName, this.os);
      } catch (e) {
      return undefined 
    }
  }

  async download(service: IService, version?: string): Promise<string[]> {
    let paths: string[] = [];
    service.assets.forEach(async (asset) => {
      const parsedUrl = url.parse(asset)
      if (parsedUrl === undefined || parsedUrl.pathname === undefined) {
        throw new Error(`Could not parse download url`)
      }
      const pathParts = parsedUrl.pathname.split('/')
      const tailPart = pathParts.pop()
      let fileName =""
      if(tailPart) fileName = tailPart.slice(1);
      const downloadPath = await downloadAsset(asset, this.repo.dir, fileName)
      paths.push(downloadPath)
    })
    return paths
  }

  async unpack(service: IService, assetPaths: string[]) {

    assetPaths.forEach(async (asset) => {
    })
  }
}