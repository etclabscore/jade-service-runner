import {Repo} from "./repo";
import {Config} from "./config";
import {getOS, getAvailableTCPPort, getAvailableUDPPort} from "./util";
import { spawn } from "child_process";
import { ICommands, IService, IServiceEnv, EnvArgs, ISequenceCmd } from "./service";

export interface ITaskOptions {
  intervalMS: number;
}
interface IDynamicPorts {
      DYNAMIC_TCP_PORT_1: number;
      DYNAMIC_TCP_PORT_2: number;
      DYNAMIC_TCP_PORT_3: number;
      DYNAMIC_UDP_PORT_1: number;
      DYNAMIC_UDP_PORT_2: number;
      DYNAMIC_UDP_PORT_3: number;
}

export class TaskManager {

  public repo: Repo;
  public config: Config;
  public options: ITaskOptions | undefined;
  public manager: TaskProcessManager;

  constructor(repo: Repo, config: Config, options?: ITaskOptions) {
    this.repo = repo;
    this.config = config;
    this.options = options;
    this.manager = new TaskProcessManager();
  }

  public async startService(serviceName: string, version: string, env: string) {

    const serviceEntry = await this.repo.getServiceEntry(serviceName, version);
    if (serviceEntry === undefined) { throw new Error("Service does not exists in repo"); }
    const {rpcPort, commands, environments} = this.config.getService(serviceName, getOS());
    const {args} = environments.find((e) => e.name === env) as IServiceEnv;

    const taskService = {
      env,
      version: serviceEntry.version,
      name: serviceName,
      args,
      commands,
      path: serviceEntry.path,
      running: false,
      rpcPort,
    };
    return this.manager.launchTask(taskService);
  }

 public listActiveServices() {
   const services: ITaskService[] = [];
   this.manager.taskMap.forEach((v) => {

     const {name, env, running} = v;
     if (running) { services.push(v); }
   });
   return services;
 }
}

interface ITaskService {
  env: string;
  rpcPort: string;
  name: string;
  version: string;
  path: string;
  commands: ICommands;
  args: EnvArgs;
  running: boolean;
}

export class TaskProcessManager {

  public taskMap: Map<string, ITaskService>;
  constructor() {
    this.taskMap = new Map<string, ITaskService>();
  }

// TODO makes assumption that setup tasks don't fail
 public async spawnSeqCommands(cmds: ISequenceCmd[]) {
   cmds.forEach(async (cmd) => {
     await new Promise((resolve) => {
       const child = spawn(cmd.cmd, cmd.args);
       child.on("error", (err) => {
         throw err;
       });
       child.on("exit", () => {
         resolve();
       });
     });
   });
 }
  public async launchTask(service: ITaskService): Promise<ITaskService> {

    this.addTask(service);
    const renderedService = await this.renderCommands(service);

    // TODO makes assumption that setup processes exit prior to running hte main process
    await this.spawnSeqCommands(renderedService.commands.setup);
    const child = spawn(`${renderedService.commands.start}`, renderedService.args.start);
    child.stdout.on("data", (data) => {
      console.log(`${service.name}: stdout: ${data}`);
    });

    child.stderr.on("data", (data) => {
      console.log(`${service.name}: stderr: ${data}`);
    });

    child.on("close", (code) => {
      console.log(`${service.name}: child process exited with code ${code}`);
      // TODO Controversial relaunch on service
      this.launchTask(service);
    });
    child.on("error", (err) => {
      console.log(`${service.name}: child process exited with err ${err}`);
      // TODO Controversial relaunch on service
      this.launchTask(service);
    });
    service.running = true;
    renderedService.running = true;
    console.log("===Service Config or launching service");
    console.log("%j", renderedService);
    return renderedService;
  }
  public async getFreePorts(): Promise<IDynamicPorts> {
    const tcpPorts = [1, 2, 3].map(() => getAvailableTCPPort());
    const udpPorts = [1, 2, 3].map(() => getAvailableUDPPort());

    const availPorts = await Promise.all([...tcpPorts, ...udpPorts]) as number[];
    return {
      DYNAMIC_TCP_PORT_1: availPorts[1],
      DYNAMIC_TCP_PORT_2: availPorts[2],
      DYNAMIC_TCP_PORT_3: availPorts[3],
      DYNAMIC_UDP_PORT_1: availPorts[4],
      DYNAMIC_UDP_PORT_2: availPorts[5],
      DYNAMIC_UDP_PORT_3: availPorts[6],
    };
  }

  private addTask(service: ITaskService ) {
    const hash = this.taskHash(service);
    if (this.taskMap.has(hash)) { return; }
    this.taskMap.set(hash, service);
  }

  private taskHash(service: ITaskService): string {
      return `${service.name}_${service.version}_${service.env}`;
  }
  private async renderCommands(service: ITaskService): Promise<ITaskService> {
    // TODO add support explict rpcPort listing
    const {
      DYNAMIC_TCP_PORT_1,
      DYNAMIC_TCP_PORT_2,
      DYNAMIC_TCP_PORT_3,
      DYNAMIC_UDP_PORT_1,
      DYNAMIC_UDP_PORT_2,
      DYNAMIC_UDP_PORT_3,
    } = await this.getFreePorts();
    const SERVICE_DIR = service.path;
    const renderArgs = (cmds: string[]) => cmds.map((cmd) => eval("`" + cmd + "`"));
    const renderCmd = (cmd: string) => eval("`" + cmd + "`");
    const renderSequenceCmd = (seqCmds: ISequenceCmd[]) => seqCmds.map((cmd) => {
      return {
        args: renderArgs(cmd.args),
        cmd: renderCmd(cmd.cmd),
      };
    });

    const command = {
      setup: renderSequenceCmd(service.commands.setup),
      start : renderCmd(service.commands.start),
      stop : renderCmd(service.commands.stop),
      teardown : renderCmd(service.commands.teardown),
    };

    const args = {
      start: renderArgs(service.args.start),
      stop: renderArgs(service.args.stop),
      teardown: renderArgs(service.args.teardown),
    };

    const rpcPort = eval("`" + service.rpcPort + "`");
    return {
      ...service,
      commands: command,
      rpcPort,
      args,
    };
}

}
