import {Repo} from './repo';
import {Config} from './config';
import {getOS, getAvailableTCPPort, getAvailableUDPPort} from './util';
import { spawn } from 'child_process';
import { IService, IServiceEnv } from './service';

export interface ITaskOptions {
  intervalMS:number,
}
interface IDynamicPorts {
      DYNAMIC_TCP_PORT_1: number,
      DYNAMIC_TCP_PORT_2: number,
      DYNAMIC_TCP_PORT_3: number,
      DYNAMIC_UDP_PORT_1: number,
      DYNAMIC_UDP_PORT_2: number,
      DYNAMIC_UDP_PORT_3: number 
}

export class TaskManager {

  repo:Repo;
  config:Config;
  options:ITaskOptions | undefined;
  manager: TaskProcessManager;
  
  constructor(repo: Repo, config: Config, options?:ITaskOptions){
    this.repo = repo;
    this.config = config;
    this.options = options;
    this.manager = new TaskProcessManager();
  }

  async startService(serviceName:string, env:string){
    
    const serviceEntry = await this.repo.getServiceEntry(serviceName)
    if(serviceEntry === undefined) throw new Error('Service does not exists in repo')
    const {rpcPort, commands, environments} = this.config.getService(serviceName,getOS())
    const {args}= environments.find((e)=>e.name === env) as IServiceEnv;
    
    const taskService = {
      env,
      version: serviceEntry.version,
      name: serviceName,
      args,
      commands,
      path: serviceEntry.path,
      running: false,
      rpcPort
    }
    return this.manager.launchTask(taskService)
     
    //TODO exec command then track the PID business
  }

}

interface ICommand {
  start: string,
  stop: string,
  teardown: string
}
interface ITaskService {
  env: string,
  rpcPort: string,
  name: string,
  version: string,
  path: string,
  commands:ICommand,
  args: ICommand,
  running: boolean,
}

export class TaskProcessManager {

  taskMap: Map<string, ITaskService>;
  constructor(){
    this.taskMap = new Map<string, ITaskService>();
  }



  async launchTask(service: ITaskService): Promise<ITaskService> {

    this.addTask(service)    
    const renderedService = await this.renderCommands(service)

    console.log("%j", renderedService)
 /*   const child = spawn(renderedService.commands.start)
    child.stdout.on('data', (data) => {
      console.log(`${service.name}: stdout: ${data}`);
    });
    
    child.stderr.on('data', (data) => {
      console.log(`${service.name}: stderr: ${data}`);
    });
    
    child.on('close', (code) => {
      console.log(`${service.name}: child process exited with code ${code}`);
    });
    child.on("error",(err)=>{
      console.log(`${service.name}: child process exited with err ${err}`);
    })*/
    service.running = true;
    return renderedService;
  }

  private addTask(service: ITaskService ) {
    const hash = this.taskHash(service)
    if(this.taskMap.has(hash)) return;
    this.taskMap.set(hash, service)
  }

  private taskHash(service: ITaskService): string{
      return `${service.name}_${service.version}_${service.env}`
  }
  private async renderCommands(service: ITaskService): Promise<ITaskService>{
    //TODO add support explict rpcPort listing
    const {
      DYNAMIC_TCP_PORT_1,
      DYNAMIC_TCP_PORT_2,
      DYNAMIC_TCP_PORT_3,
      DYNAMIC_UDP_PORT_1,
      DYNAMIC_UDP_PORT_2,
      DYNAMIC_UDP_PORT_3
    } = await this.getFreePorts()
    const SERVICE_DIR = service.path;
    const command = {
      start : eval("`" + service.commands.start + "`"),
      stop : eval("`" + service.commands.stop + "`"),
      teardown : eval("`" + service.commands.teardown + "`"),
    }
    const args = {
      start: eval("`" + service.args.start + "`"),
      stop: eval("`" + service.args.stop + "`"),
      teardown: eval("`" + service.args.teardown + "`")
    }
    const rpcPort = eval("`" + service.rpcPort +"`")
    return {
      ...service,
      commands: command,
      rpcPort,
      args
    }
}
  async getFreePorts(): Promise<IDynamicPorts>{
    const tcpPorts = [1,2,3].map(()=> getAvailableTCPPort())
    const udpPorts = [1,2,3].map(()=> getAvailableUDPPort())

    const availPorts = await Promise.all([...tcpPorts, ...udpPorts]) as number[]
    return {
      DYNAMIC_TCP_PORT_1: availPorts[1],
      DYNAMIC_TCP_PORT_2: availPorts[2],
      DYNAMIC_TCP_PORT_3: availPorts[3],
      DYNAMIC_UDP_PORT_1: availPorts[4],
      DYNAMIC_UDP_PORT_2: availPorts[5],
      DYNAMIC_UDP_PORT_3: availPorts[6]
    }
  }

}