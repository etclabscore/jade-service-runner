/**
 * ServiceManager and ServiceProcessManager launch and manage services, keeping services that have been
 * launched alive, until the ServiceRunner process is killed.
 *
 * ServiceManager exposes the public interfaces for starting and listing active services
 */
import { Repo } from "./repo";
import { Config, ServiceEnv } from "./config";
import { getOS } from "./util";
import { ServiceProcessManager } from "./serviceProcessManager";
import { ActiveServiceSpec } from "./service";

import { makeLogger } from "./logging";
import { EventEmitter } from "events";
import * as events from "./events";
export interface ServiceOptions {
  intervalMS: number;
}

const logger = makeLogger("ServiceRunner", "ServiceManager");
/*
 * ServiceManager provide a high level interface, to launch and list running services from.
*/
export class ServiceManager {

  public repo: Repo;
  public config: Config;
  public options: ServiceOptions | undefined;
  public manager: ServiceProcessManager;
  public notifications: events.ExternalServiceNotifications;

  constructor(repo: Repo, config: Config, options?: ServiceOptions) {
    this.repo = repo;
    this.config = config;
    this.options = options;
    this.manager = new ServiceProcessManager();
    this.notifications = new EventEmitter();

    // setup external service notifications that with an abstraction away from the process manager's external events
    this.manager.subscribe("launched", (notification) => { this.notifications.emit("launched", notification); });
    this.manager.subscribe("terminated", (notification) => { this.notifications.emit("terminated", notification); });
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
  public async startService(serviceName: string, version: string, env: string): Promise<ActiveServiceSpec> {

    const serviceEntry = await this.repo.getServiceEntry(serviceName, version);
    if (serviceEntry === undefined) { throw new Error("Service does not exists in repo"); }
    const { rpcPort, commands, environments } = this.config.getService(serviceName, getOS());
    const { args, health } = environments.find((e) => e.name === env) as ServiceEnv;

    const service = {
      env,
      health,
      version: serviceEntry.version,
      name: serviceName,
      args,
      commands,
      path: serviceEntry.path,
      rpcPort,
      notifications: new EventEmitter(),
    };

    const svc = this.manager.getService(serviceName, version, env);
    if (svc && svc.active && svc.active.state === "running") {
      return svc.active;
    }

    return new Promise((resolve) => {
      logger.debug(`Launching ${service.name} in ${service.env}`);
      service.notifications.once("launched", (svcDesc) => {
        logger.debug(`Launched ${svcDesc.name} in ${svcDesc.env}`);
        resolve(svcDesc);
      });
      this.manager.launchService(service);
    });

  }

  /**
   * Starts an installed service using the service configuration and manifest entry, and
   * returns service configuration information.
   *
   *
   * @param serviceName - Name of the service
   * @param version - Version of the service
   * @param env - Environment
   * @returns void
   */
  public async stopService(serviceName: string, version: string, env: string): Promise<ActiveServiceSpec | undefined> {
    logger.debug(`stopping service: ${serviceName} - ${version} - ${env}`);
    const serviceDesc = this.manager.getService(serviceName, version, env);
    if (serviceDesc === undefined) {
      logger.error(`Service tag not found service: ${serviceName} - ${version} - ${env}`);
      return;
    }
    if (serviceDesc.active === undefined) {
      logger.error(`Active service tag not found service: ${serviceName} - ${version} - ${env}`);
      return;
    }
    return this.manager.terminateService(serviceDesc.active);
  }

  /**
   * Returns a list of currently active services
   *
   * @returns The active list of services
   */
  public listActiveServices() {
    const services: ActiveServiceSpec[] = [];
    logger.debug("Listing active services");
    this.manager.activeServiceCache.forEach((v: ActiveServiceSpec) => {

      const { state } = v;
      if (state === "running") { services.push(v); }
    });
    return services;
  }
}
