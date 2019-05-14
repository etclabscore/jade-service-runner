import { mockConfig, mockServer } from '../../fixtures/src/util';
import {Config} from './config';
import { Repo } from './repo';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { TaskManager } from './task';
import { AddressInfo } from 'net';
import http from 'http'; 
import { IServiceConfig } from './service';
import { getOS } from './util';
import { Installer } from './installer';
const rmDir = promisify(rimraf)
describe("TaskManager", ()=>{
  let repoDir:string; 
  let server: http.Server;
beforeEach(async ()=>{
  repoDir = fs.mkdtempSync('test-repo-task')
  server = await mockServer('fixtures/testService.zip')
})
afterEach(async ()=>{
   // await promisify(server.close)()
//  await rmDir(repoDir)
})
it("should construct new TaskManager", async ()=>{
  const config:Config = new Config(mockConfig)
  const repo = new Repo(repoDir)
  await repo.init()
  let taskManager = new TaskManager(repo, config)
})
it.only("should start a service", async ()=>{
  const config = new Config(mockConfig)
  const {port} = server.address() as AddressInfo;
  const svc = config.config.services.find((s: IServiceConfig) => s.name === "testService")
  if(svc === undefined ) throw new Error('could not find testService')
  const service = svc.os[getOS()];
  if (service === undefined) throw new Error('could not find service for os')
  service.assets = [`http://localhost:${port}/download/testService.zip`]
  console.log("%j", config);
  const repo = new Repo(repoDir)
  await repo.init()
  const installer = new Installer(config, getOS(), repo)
  let taskManager = new TaskManager(repo, config)
  await installer.install("testService", "1.0.0")
  const serviceConfig = await taskManager.startService("testService", "1.0.0", "test")
  console.log(serviceConfig)
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, 3000);
    })
  })
})