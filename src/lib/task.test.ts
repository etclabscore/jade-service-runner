import { mockConfig } from '../../fixtures/src/util';
import {Config} from './config';
import { Repo } from './repo';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import { promisify } from 'util';
import { TaskManager } from './task';
const rmDir = promisify(rimraf)
describe.only("TaskManager", ()=>{
  let repoDir:string; 
beforeEach(()=>{
  repoDir = fs.mkdtempSync('test-repo-task')
})
afterEach(async ()=>{
  await rmDir(repoDir)
})
it("should construct new TaskManager", async ()=>{
  const config:Config = new Config(mockConfig)
  const repo = new Repo(repoDir)
  await repo.init()
  let taskManager = new TaskManager(repo, config)
})
it("should start a service", async ()=>{
  const config = new Config(mockConfig)
  const repo = new Repo(repoDir)
  await repo.init()
  let taskManager = new TaskManager(repo, config)
  const serviceConfig = taskManager.startService("testService", "test")
})

})