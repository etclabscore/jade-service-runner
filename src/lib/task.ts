/**
 * TaskManager and TaskProcessManager launch and manage services, keeping services that have been
 * launched alive, until the ServiceRunner process is killed.
 *
 * TaskManager exposes the public interfaces for starting and listing active services
 */
import { Repo } from "./repo";
import { Config } from "./config";
import { getOS } from "./util";
import { TaskProcessManager } from "./taskProcessManager";
import {
  IServiceEnv,
  ActiveTaskService,
} from "./service";
import { makeLogger } from "./logging";
import { EventEmitter } from "events";
export interface ITaskOptions {
  intervalMS: number;
}

const logger = makeLogger("ServiceRunner", "TaskManager");
/*
 * TaskManager provide a high level interface, to launch and list running services from.
*/
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

  /**
   * Starts an installed service using the service configuration and manifest entry, and
   * returns service configuration information.
   *
   *
   * @param serviceName - Name of the service
   * @param version - Version of the service
   * @param env - Environment
   * @returns The rendered version of the service configuration
   */
  public async startService(serviceName: string, version: string, env: string): Promise<ActiveTaskService> {

    const serviceEntry = await this.repo.getServiceEntry(serviceName, version);
    if (serviceEntry === undefined) { throw new Error("Service does not exists in repo"); }
    const { rpcPort, commands, environments } = this.config.getService(serviceName, getOS());
    const { args } = environments.find((e) => e.name === env) as IServiceEnv;

    const taskService = {
      env,
      version: serviceEntry.version,
      name: serviceName,
      args,
      commands,
      path: serviceEntry.path,
      rpcPort,
      notifications: new EventEmitter(),
    };

    return new Promise((resolve) => {
      logger.debug(`Launching ${taskService.name} in ${taskService.env}`);
      taskService.notifications.once("launched", (service) => {
        logger.debug(`Launched ${service.name} in ${service.env}`);
        resolve(service);
      });
      this.manager.launchTask(taskService);
    });

  }
  /**
   * Returns a list of currently active services
   *
   * @returns The active list of services
   */
  public listActiveServices() {
    const services: ActiveTaskService[] = [];
    logger.debug("Listing active services");
    this.manager.activeTaskMap.forEach((v: ActiveTaskService) => {

      const { state } = v;
      if (state === "running") { services.push(v); }
    });
    return services;
  }
}
