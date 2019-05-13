import { promisify } from 'util';
import { parse, resolve } from 'url';
import request, { UriOptions } from 'request';
import { createWriteStream, mkdir, createReadStream } from 'fs';
import path from 'path';
import { ensureDirSync, WriteFileOptions } from 'fs-extra';
import { Readable, Writable, Transform } from 'stream';
import {Config, OSTypes} from './config';
import {IService} from './service';
import {Repo} from './repo';
import url from 'url';

const get = promisify(request.get)

const fsMkdir = promisify(mkdir)

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
    this.repo.addService(service,downloadPaths)
    if (this.serviceExists(serviceName, version)) return
    try {
//      await this.unpack(serviceName, version)
    } catch (e) {
      return e
    }
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
      const fileName = parsedUrl.pathname.slice(1);
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

export const downloadAsset = async (uri: string, dir: string, name: string): Promise<string> => {
  await fsMkdir(dir, { recursive: true })
  const path = `${dir}/${name}`;
  return new Promise((resolve: (path: string) => void) => {
    const file = createWriteStream(path)
    request.get({ uri })
      .pipe(file);
    file.on('finish', () => {
      file.close()
      resolve(path)
    });
  });

}

