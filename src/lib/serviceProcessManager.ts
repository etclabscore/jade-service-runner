/**
 *  ServiceProcessManager launchs and manage services, keeping services that have been
 *  launched alive, until the ServiceRunner process is killed explictly.
 *  ServiceProcessManager keeps a record of processes launched, and processes installed. It creates a unidirectional flow for
 *  process run by service runner. It acts as a sink for processes that are being launched, and includes providing hooks for
 *  downstream consumers to subscribe to process level events.
 */
import { ServiceSpec, ActiveServiceSpec, ServiceStatus } from "./service";
import { SequenceCmd } from "./config";
import * as config from "./config";
import * as events from "./events";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { kill } from "process";
import { renderService } from "./serviceTemplate";
import { makeLogger } from "./logging";
import * as util from "./util";
import { EventEmitter } from "events";

const logger = makeLogger("ServiceRunner", "ServiceProcessManager");
/**
 * ServiceProcessManager provides an internal interface to manage services that are requested. It
 * acts as a process manager and provides hooks for downstream components to subscribe to events,
 * that pretain to specific service processes.  When a service is launched it starts at the beginning of a state machine,
 * that most likely transitions as follows.
 *
 * ### Simple Process state machine:
 * **PendingServiceEvent** => **LaunchServiceEvent** => **ExitServiceEvent**;
 *
 *
 * ### Health Check Failure state machine:
 * **PendingServiceEvent** => **LaunchServiceEvent** => **HealthServiceEvent** => **StopServiceEvent** => **ExitServiceEvent**;
 * The state transitions are handled by a sink called processServiceEvents(), which consumes the process events on the EventBus
 * to handle state transitions.
 *
 * ### The Events:
 *
 * **PendingServiceEvent** : signals an unresolved templated service that is up for launching. This is pushed onto
 * the event bus, and then written the service config cache and the active service cache. It is written in the
 * service running cache with the state pending. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **LaunchServiceEvent**: signals a resolved template service that is ready to launch. This is pushed on to the event bus
 * and handled by the sink called processServiceEvents(), which consumes the launch events. It then spawns a new process
 * with any additional features, and updates the service state in the active service cache. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **ExitServiceEvent**: signals a resolved template service that was terminated for some reason. This event is pushed on the eventbus
 * and then handled by the sink called processServiceEvents(), which consumes the exit events.It then updates the service state in the active service cache. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal. TBD in future this might emit a launch event.
 *
 * **StopServiceEvent**: signals a resolved template service to stop executing. This event is pushed on the eventbus
 * and then handled by the sink called processServiceEvents(), which consumes the stop events.It then kills tthe service. Killing the service triggers A corresponding exit event and
 * a stopped message is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **TerminateServiceEvent**: signals a resolved template service to stop excuting and not restart. This event is pushed on the eventbus
 * and then handled by the sink called processServiceEvents(), which consumes the terminate event.It then kills the service and prevents the service from being rescheduled.
 *
 * **HealthServiceEvent**: signals a need for a template service to be healtht checked. This event is pushed on the eventbus
 * and then handled by the sink called processServiceEvents(), which consumes the healthcheck events. It then performs a health check based on port accessibility. If the health check fails
 * the service health cache is updated and if it violates the number of retries constraint, a StopServiceEvent is emitted. If the health check is successful the health check cache for that service
 * is reset and a new health check event is emitted corresponding to the health check interval specified in config.
 *
 * **ConsoleServiceEvent**: signals an event  that occurs do to some stdout/stderr activity coming from the service, this is then forward to any
 * downstream components taht wich to receive this signal, via the service notifications queue.
 *
 */
interface Health {
  retries: number;
  timestamp: number;
}

interface ServiceDesc {
  active?: ActiveServiceSpec;
  spec: ServiceSpec;
}

const printActiveServiceCache = (activeServiceCache: Map<string, ActiveServiceSpec>) => {
  activeServiceCache.forEach((s, hash) => {
    let pid: number = -1;
    if (s.process) {
      pid = s.process.pid;
    }
    logger.debug(`${s.state.toUpperCase()}     pid: ${pid} status: ${s.state} hash:${hash}`);
  });
};

const DEFAULT_SERVICE_RESTART_DELAY = 5000;
export class ServiceProcessManager {

  public serviceCache: Map<string, ServiceSpec>;
  public activeServiceCache: Map<string, ActiveServiceSpec>;
  private externalNotifications: events.ExternalServiceNotifications;
  private notifications: events.EventBus;
  private healthCache: Map<number, Health>;
  constructor() {
    this.serviceCache = new Map<string, ServiceSpec>();
    this.activeServiceCache = new Map<string, ActiveServiceSpec>();
    this.healthCache = new Map<number, Health>();
    this.notifications = new events.EventBus(this.processServiceEvents.bind(this));
    this.externalNotifications = new EventEmitter();
  }

  public subscribe(type: "launched" | "terminated", handler: (notify: events.ExternalServiceNotification) => void) {
    this.externalNotifications.on(type, handler);
  }

  /**
   * Launches a service, generating a pending service event that ultimately triggers writing a resolved service and unresolved template of that service
   * to an internal cache. It is used to spawn a new service, it then returns a fully resolved service that includes a pid.
   *
   * @param service - Configuration for a templated service
   * @returns The rendered configuration for a service
   */
  public async launchService(service: ServiceSpec): Promise<ServiceSpec> {

    return new Promise((resolve) => {
      const pendingServiceEvent: events.PendingServiceEvent = { name: "pending", service };
      this.notifications.emit(pendingServiceEvent);
      service.notifications.once("launched", (svc) => {
        resolve(svc);
      });
    });
  }

  /**
   * Returns a ServiceDesc for a service including both the active running service and original spec
   * @param name - Service name that corresponds to spec
   * @param version - Service version that corresponds to spec
   * @param env - Service environment name that corresponds to spec
   * @returns The rendered configuration for a service
   */
  public getService(name: string, version: string, env: string): ServiceDesc | undefined {
    const serviceHash = this.serviceHash({ name, version, env });
    const spec = this.serviceCache.get(serviceHash);
    const active = this.activeServiceCache.get(serviceHash);
    if (active !== undefined && active.process) {
      logger.debug("getting the service active pid: " + active.process.pid);
    }
    if (spec === undefined) {
      return;
    }
    return { active, spec };
  }

  /**
   * Terminates a service, generating a terminate service event that ultimately triggers permanently stopping a service from running. Until explicitly re-launched.
   *
   * @param service - Configuration for a templated service
   * @returns The rendered configuration for a service
   */
  public async terminateService(service: ActiveServiceSpec): Promise<ActiveServiceSpec> {

    return new Promise((resolve) => {
      const terminateService: events.TerminateServiceEvent = { name: "terminate", service };
      service.notifications.once("terminated", (svc) => {
        resolve(svc);
      });
      this.notifications.emit(terminateService);
    });
  }

  public async checkServiceHealth(service: ActiveServiceSpec): Promise<boolean> {
    if (service.health === undefined) {
      return true;
    }
    const port = parseInt(service.health.port, 10);
    return util.isUp(port, service.health.protocol);
  }

  private handleConsoleEvent(event: events.ConsoleServiceEvent) {
    if (event.stderr) {
      event.logger.error(`stderr: ${event.stderr}`);
    }
    if (event.stdout) {
      event.logger.debug(`stdout: ${event.stdout}`);
    }
  }

  private handleStopEvent(event: events.StopServiceEvent) {
    const { service, reason } = event;
    const { process } = service;
    const stopMsg = `${service.name}: child process triggered to stop for: ${reason}`;
    logger.debug(`${stopMsg} ${reason}`);
    if (process === undefined) {
      return;
    }
    kill(process.pid, "SIGTERM");
  }

  private cleanupService(service: ActiveServiceSpec) {
    const serviceID = this.serviceHash(service);
    this.setServiceCacheEntry(service, "stopped");
    this.activeServiceCache.delete(serviceID);
  }

  private handleExitEvent(event: events.ExitServiceEvent) {
    const { service, error } = event;
    const exitMsg = `${service.name}: child process exited`;
    const serviceID = this.serviceHash(service);
    // service has already been removed already
    if (this.activeServiceCache.has(serviceID) === false) {
      logger.info(JSON.stringify(this.activeServiceCache));
      return;
    }
    const serviceEntry = this.activeServiceCache.get(serviceID) as ActiveServiceSpec;
    const process = serviceEntry.process;
    // the service update is stale, and does not correspond to current active service cache state
    if (process && service.process && process.pid !== service.process.pid) {
      return;
    }
    if (error) {
      event.logger.error(`${exitMsg} with err ${error}`);
    }
    this.cleanupService(service);
    const relaunchDelay = service.health ? service.health.interval : DEFAULT_SERVICE_RESTART_DELAY;
    service.notifications.emit("stopped", service);
    const { rpcPort, env, version, name } = service;
    // TODO require protocol needs protocol
    this.externalNotifications.emit("terminated", { protocol: "http", rpcPort, env, version, name });
    setTimeout(() => {
      const serviceSpec = this.serviceCache.get(serviceID) as ServiceSpec;
      this.notifications.emit({ name: "pending", service: serviceSpec });
    }, relaunchDelay);
    event.logger.error(`${exitMsg}`);
  }

  private async handleLaunchEvent(event: events.LaunchServiceEvent) {
    const { service } = event;
    await this.spawnSeqCommands(service.commands.setup);
    const child = spawn(`${service.commands.start}`, service.args.start);
    const childLogger = event.logger;
    child.stdout.on("data", (data) => {
      this.notifications.emit({ name: "console", stdout: data, logger: childLogger, service });
    });

    child.stderr.on("data", (data) => {
      this.notifications.emit({ name: "console", stderr: data, logger: childLogger, service });
    });

    child.on("close", (code) => {
      this.notifications.emit({ name: "exit", code, logger: childLogger, service });
    });
    child.on("error", (err) => {
      this.notifications.emit({ name: "exit", error: err, code: -1, logger: childLogger, service });
    });

    service.process = child;
    const spec = this.setServiceCacheEntry(service, "running") as ActiveServiceSpec;
    const retries = 5;
    this.sendHealthEvent(service);
    await this.initialHealthCheck(spec);
    // Launch event is only emitted when the initial health check is verified if it exists
    logger.info(`launched service ${service.name} version: ${service.version}  environment: ${service.env}`);
    service.notifications.emit("launched", service);
    // TODO require protocol needs protocol
    const { rpcPort, env, version, name } = service;
    this.externalNotifications.emit("launched", { protocol: "http", rpcPort, env, version, name });
  }

  // An exponential backoff for initial service bootup that is bound by users health check params.
  private async initialHealthCheck(service: ActiveServiceSpec) {
    if (service.health) {
      const terminalTimestamp = Date.now() + service.health.retries * service.health.interval;
      await new Promise((resolve) => {

        const backOff = (n: number) => {
          const timeout = n === -1 ? 0 : Math.pow(2, n) * 500 + Math.random() * 1000;
          logger.debug(`initial health check in ${timeout}ms ${terminalTimestamp} < ${Date.now()}`);
          setTimeout(async () => {
            const health = await this.checkServiceHealth(service);
            if (health === false && terminalTimestamp > Date.now()) {
              backOff(n + 1);
            } else {
              logger.debug(`initialization health check complete: ${health}`);
              resolve();
            }
          }, timeout);
        };
        backOff(-1);
      });
    }
  }

  private sendHealthEvent(service: ActiveServiceSpec, healthStatus?: Health) {
    const defaultHealth = { retries: 0, timestamp: Date.now() };
    const health = healthStatus ? healthStatus : defaultHealth;
    if (service.health !== undefined && service.state === "running") {
      const process = service.process as ChildProcessWithoutNullStreams;
      // Set the initial state for the service in the service health cache
      this.healthCache.set(process.pid, health);
      setTimeout(() => this.notifications.emit({ name: "health", service, logger }), service.health.interval);
    }
  }

  private async handleTerminateEvent(event: events.TerminateServiceEvent) {
    const { service } = event;
    const process = service.process as ChildProcessWithoutNullStreams;
    // disable any handlers attached to the process;
    process.removeAllListeners();
    this.cleanupService(service);
    process.kill("SIGTERM");
    service.notifications.emit("terminated", service);
  }

  private async handleHealthEvent(event: events.HealthServiceEvent) {
    const { process } = event.service;
    const health = event.service.health as config.Health;
    let success = false;
    const timestamp = Date.now();
    if (process) {
      const { pid } = process;
      try {
        success = await this.checkServiceHealth(event.service);
      } catch (e) {
        logger.error(e.message);
        logger.debug(e.stack);
        return;
      }
      const currentHealth = this.healthCache.get(pid);
      if (currentHealth === undefined) {
        return;
      }
      const newHealth = success ? { timestamp, retries: 0 } : { timestamp, retries: currentHealth.retries + 1 };

      this.healthCache.set(pid, newHealth);
      if (newHealth.retries >= health.retries) {
        // restart failing process
        this.notifications.emit({ name: "stop", service: event.service, logger: event.logger, reason: "health" });
        return;
      }
      // schedule next health request
      this.sendHealthEvent(event.service, newHealth);

    }
  }

  private async processServiceEvents(event: events.ServiceEvent) {
    const { service } = event;
    logger.debug(`${event.name.toUpperCase()} -  processing event:${event.name}  service: ${service.name} env: ${service.env}`);
    printActiveServiceCache(this.activeServiceCache);
    switch (event.name) {
      case "console":
        this.handleConsoleEvent(event);
        return;
      case "error":
        throw new Error(`Could not handle service process error ${event.error}`);
      case "stop":
        this.handleStopEvent(event);
        return;
      case "terminate":
        this.handleTerminateEvent(event);
        return;
      case "exit":
        this.handleExitEvent(event);
        return;
      case "pending":
        await this.handlePendingEvent(event);
        return;
      case "launch":
        await this.handleLaunchEvent(event);
        return;
      case "health":
        await this.handleHealthEvent(event);
        return;
    }
  }

  private async handlePendingEvent(event: events.PendingServiceEvent) {
    const { service } = event;
    await this.setServiceCacheEntry(service, "spec");
    const renderedService = await renderService(service);
    this.setServiceCacheEntry(renderedService, "pending");
    const serviceRoute = `/${renderService.name}/${renderedService.env}/${renderedService.version}`;
    const serviceLogger = makeLogger(renderedService.name, "Child Service Process", serviceRoute);
    service.notifications.emit("pending", renderedService);
    this.notifications.emit({ service: renderedService, name: "launch", logger: serviceLogger });
  }

  private async spawnSeqCommands(cmds: SequenceCmd[]) {
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

  private setServiceCacheEntry(service: ServiceSpec, status: ServiceStatus): ActiveServiceSpec | ServiceSpec {
    if (status === "spec") {
      this.addServiceSpec(service);
      return service;
    }
    const activeService = service as ActiveServiceSpec;
    activeService.state = status;
    this.addActiveServiceSpec(activeService);
    return activeService;
  }

  private addServiceSpec(service: ServiceSpec) {
    const hash = this.serviceHash(service);
    if (this.serviceCache.has(hash)) {
      return service;
    }
    this.serviceCache.set(hash, service);
  }

  private addActiveServiceSpec(service: ActiveServiceSpec) {
    const hash = this.serviceHash(service);
    this.activeServiceCache.set(hash, service);
  }

  private serviceHash({ name, version, env }: { name: string, version: string, env: string }): string {
    return `${name}_${version}_${env}`;
  }
}
