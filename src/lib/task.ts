import {Repo} from './repo';
import {Config} from './config';
import {getOS} from './util';

export interface ITaskOptions {
  intervalMS:number,
}
export class TaskManager {

  repo:Repo;
  config:Config;
  options:ITaskOptions | undefined;
  constructor(repo: Repo, config: Config, options?:ITaskOptions){
    this.repo = repo;
    this.config = config;
    this.options = options;
  }

  async startService(serviceName:string, env:string){
    
    const serviceEntry = await this.repo.getServiceEntry(serviceName)
    if(serviceEntry === undefined) throw new Error('Service does not exists in repo')
    const {commands} = this.config.getService(serviceName,getOS())
    //TODO exec command then track the PID business
    console.log(`exec: cd ${serviceEntry.path}`)
    console.log(commands.start)
  }

}