/**
 *  TaskProcessManager launchs and manage services, keeping services that have been
 *  launched alive, until the ServiceRunner process is killed explictly.
 *  TaskProcessManager keeps a record of processes launched, and processes installed. It creates a unidirectional flow for
 *  process run by service runner. It acts as a sink for processes that are being launched, and includes providing hooks for
 *  downstream consumers to subscribe to process level events.
 */
import { ITaskService, ActiveTaskService, IHealth, ISequenceCmd, TaskStatus } from "./service";
import * as events from "./events";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { kill } from "process";
import { renderService } from "./serviceTemplate";
import { makeLogger } from "./logging";
import * as util from "./util";

const logger = makeLogger("ServiceRunner", "TaskProcessManager");
/**
 * TaskProcessManager provides an internal interface to manage services that are requested. It
 * acts as a process manager and provides hooks for downstream components to subscribe to events,
 * that pretain to specific tasks.  When a service is launched it starts at the beginning of a state machine,
 * that most likely transitions as follows.
 *
 * ### Simple Process state machine:
 * **PendingTaskEvent** => **LaunchTaskEvent** => **ExitTaskEvent**;
 *
 *
 * ### Health Check Failure state machine:
 * **PendingTaskEvent** => **LaunchTaskEvent** => **HealthTaskEvent** => **StopTaskEvent** => **ExitTaskEvent**;
 * The state transitions are handled by a sink called processManagerTask(), which consumes the process events on the EventBus
 * to handle state transitions.
 *
 * ### The Events:
 *
 * **PendingTaskEvent** : signals an unresolved templated service that is up for launching. This is pushed onto
 * the event bus, and then written the service config cache and the active service cache. It is written in the
 * service running cache with the state pending. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **LaunchTaskEvent**: signals a resolved template service that is ready to launch. This is pushed on to the event bus
 * and handled by the sink called processManagerTask(), which consumes the launch events. It then spawns a new process
 * with any additional features, and updates the service state in the active service cache. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **ExitTaskEvent**: signals a resolved template service that was terminated for some reason. This event is pushed on the eventbus
 * and then handled by the sink called processManagerTask(), which consumes the exit events.It then updates the service state in the active service cache. A corresponding event is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal. TBD in future this might emit a launch event.
 *
 * **StopTaskEvent**: signals a resolved template service to stop executing. This event is pushed on the eventbus
 * and then handled by the sink called processManagerTask(), which consumes the stop events.It then kills tthe service. Killing the service triggers A corresponding exit event and
 * a stopped message is pushed onto the services individual
 * notification queue. So downstream components can recieve this signal.
 *
 * **TerminateTaskEvent**: signals a resolved template service to stop excuting and not restart. This event is pushed on the eventbus
 * and then handled by the sink called processManagerTask(), which consumes the terminate event.It then kills the service and prevents the service from being rescheduled.
 *
 * **HealthTaskEvent**: signals a need for a template service to be healtht checked. This event is pushed on the eventbus
 * and then handled by the sink called processManagerTask(), which consumes the healthcheck events. It then performs a health check based on port accessibility. If the health check fails
 * the service health cache is updated and if it violates the number of retries constraint, a StopTaskEvent is emitted. If the health check is successful the health check cache for that service
 * is reset and a new health check task is emitted corresponding to the health check interval specified in config.
 *
 * **ConsoleTaskEvent**: signals an event  that occurs do to some stdout/stderr activity coming from the service, this is then forward to any
 * downstream components taht wich to receive this signal, via the service notifications queue.
 *
 */
interface Health {
  retries: number;
  timestamp: number;
}

interface TaskDesc {
  active?: ActiveTaskService;
  spec: ITaskService;
}

const printActiveMap = (activeTaskMap: Map<string, ActiveTaskService>) => {
  activeTaskMap.forEach((s, hash) => {
      let pid: number = -1;
      if (s.process) {
        pid = s.process.pid;
      }
      logger.debug(`${s.state.toUpperCase()}     pid: ${pid} status: ${s.state} hash:${hash}`);
    });
};

const DEFAULT_SERVICE_RESTART_DELAY = 5000;
export class TaskProcessManager {

  public taskMap: Map<string, ITaskService>;
  public activeTaskMap: Map<string, ActiveTaskService>;
  private notifications: events.EventBus;
  private healthMap: Map<number, Health>;
  constructor() {
    this.taskMap = new Map<string, ITaskService>();
    this.activeTaskMap = new Map<string, ActiveTaskService>();
    this.healthMap = new Map<number, Health>();
    this.notifications = new events.EventBus(this.processTask.bind(this));
  }

  /**
   * Launches a service, generating a pending task event that ultimately triggers writing a resolved service and unresolved template of that service
   * to an internal cache. It is used to spawns new task, it then returns a fully resolved service that includes a pid.
   *
   * @param service - Configuration for a templated service
   * @returns The rendered configuration for a service
   */
  public async launchTask(service: ITaskService): Promise<ITaskService> {

    return new Promise((resolve) => {
      const pendingTask: events.PendingTaskEvent = { name: "pending", service };
      this.notifications.emit(pendingTask);
      service.notifications.once("launched", (svc) => {
        resolve(svc);
      });
    });
  }

  /**
   * Returns a TaskDesc for a service including both the active running service and original spec
   * @param name - Service name that corresponds to spec
   * @param version - Service version that corresponds to spec
   * @param env - Service environment name that corresponds to spec
   * @returns The rendered configuration for a service
   */
  public getService(name: string, version: string, env: string): TaskDesc | undefined {
    const taskHash = this.taskHash({ name, version, env });
    const spec = this.taskMap.get(taskHash);
    const active = this.activeTaskMap.get(taskHash);
    if (active !== undefined && active.process) {
      logger.debug("getting the service active pid: " + active.process.pid);
    }
    if (spec === undefined) {
      return;
    }
    return {active, spec};
  }

  /**
   * Stops a service, generating a terminate task event that ultimately triggers writing a resolved service and unresolved template of that service
   * to an internal cache. It is used to spawns new task, it then returns a fully resolved service that includes a pid.
   *
   * @param service - Configuration for a templated service
   * @returns The rendered configuration for a service
   */
  public async stopTask(service: ActiveTaskService): Promise<ActiveTaskService> {

    return new Promise((resolve) => {
      const terminateTask: events.TerminateTaskEvent = { name: "terminate", service };
      service.notifications.once("terminated", (svc) => {
        resolve(svc);
      });
      this.notifications.emit(terminateTask);
    });
  }

  private handleConsoleEvent(event: events.ConsoleTaskEvent) {
    if (event.stderr) {
      logger.error(`stderr: ${event.stderr}`);
    }
    if (event.stdout) {
      logger.debug(`stdout: ${event.stdout}`);
    }
  }

  private handleStopEvent(event: events.StopTaskEvent) {
    const { service, reason} = event;
    const { process } = service;
    const stopMsg = `${service.name}: child process triggered to stop for: ${reason}`;
    logger.debug(`${stopMsg} ${reason}`);
    if (process === undefined) {
      return;
    }
    kill(process.pid, "SIGTERM");
  }

  private cleanupTask(service: ActiveTaskService) {
    const serviceID = this.taskHash(service);
    this.setTask(service, "stopped");
    this.activeTaskMap.delete(serviceID);
  }

  private handleExitEvent(event: events.ExitTaskEvent) {
    const {service, error} = event;
    const exitMsg = `${service.name}: child process exited`;
    const serviceID = this.taskHash(service);
    // service has already been removed already
    if (this.activeTaskMap.has(serviceID) === false) {
      logger.info(JSON.stringify(this.activeTaskMap));
      return;
    }
    const serviceEntry = this.activeTaskMap.get(serviceID) as ActiveTaskService;
    const process = serviceEntry.process;
    // the service update is stale, and does not correspond to current task map state
    if (process && service.process && process.pid !== service.process.pid) {
      return;
    }
    if (error) {
      event.logger.error(`${exitMsg} with err ${error}`);
    }
    this.cleanupTask(service);
    const relaunchDelay = service.health ? service.health.interval : DEFAULT_SERVICE_RESTART_DELAY;
    service.notifications.emit("stopped", service);
    setTimeout(() => {
      const serviceSpec = this.taskMap.get(serviceID) as ITaskService;
      this.notifications.emit({ name: "pending", service: serviceSpec });
    }, relaunchDelay);
    event.logger.error(`${exitMsg}`);
  }

  private async handleLaunchEvent(event: events.LaunchTaskEvent) {
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
    logger.info(`launched service ${service.name} version: ${service.version}  environment: ${service.env}`);

    service.process = child;
    this.setTask(service, "running");
    service.notifications.emit("launched", service);
    this.sendHealthEvent(service);
  }

  private sendHealthEvent(service: ActiveTaskService, healthStatus?: Health) {
    const defaultHealth = { retries: 0, timestamp: Date.now()};
    const health = healthStatus ? healthStatus : defaultHealth;
    if (service.health !== undefined && service.state === "running") {
      const process = service.process as ChildProcessWithoutNullStreams;
      // Set the initial state for the service in the service health cache
      this.healthMap.set(process.pid, health);
      setTimeout(() => this.notifications.emit({ name: "health", service, logger }), service.health.interval);
    }
  }

  private async checkServiceHealth(service: ActiveTaskService): Promise<boolean> {
    if (service.health === undefined) {
      return true;
    }
    const port = parseInt(service.health.port, 10);
    return util.isUp(port, service.health.protocol);
  }

  private async handleTerminateEvent(event: events.TerminateTaskEvent) {
    const {service} = event;
    const process = service.process as ChildProcessWithoutNullStreams;
    // disable any handlers attached to the process;
    process.removeAllListeners();
    this.cleanupTask(service);
    process.kill("SIGTERM");
    service.notifications.emit("terminated", service);
  }

  private async handleHealthEvent(event: events.HealthTaskEvent) {
    const { process } = event.service;
    const health  = event.service.health as IHealth;
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
      const currentHealth = this.healthMap.get(pid);
      if (currentHealth === undefined) {
        return;
      }
      const newHealth = success ? { timestamp, retries: 0 } : { timestamp, retries: currentHealth.retries + 1 };

      this.healthMap.set(pid, newHealth);
      if (newHealth.retries >= health.retries) {
        // restart failing process
        this.notifications.emit({ name: "stop", service: event.service, logger: event.logger, reason: "health" });
        return;
       }
      // schedule next health request
      this.sendHealthEvent(event.service, newHealth);

    }
  }

  private async processTask(event: events.TaskEvent) {
    const { service } = event;
    logger.debug(`${event.name.toUpperCase()} -  processing event:${event.name}  service: ${service.name} env: ${service.env}`);
    printActiveMap(this.activeTaskMap);
    switch (event.name) {
      case "console":
        this.handleConsoleEvent(event);
        return;
      case "error":
        throw new Error(`Could not handle task error ${event.error}`);
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

  private async handlePendingEvent(event: events.PendingTaskEvent) {
    const { service } = event;
    await this.setTask(service, "spec");
    const renderedService = await renderService(service);
    this.setTask(renderedService, "pending");
    const serviceLogger = makeLogger(renderedService.name, "Child Task");
    service.notifications.emit("pending", renderedService);
    this.notifications.emit({ service: renderedService, name: "launch", logger: serviceLogger });
  }

  private async spawnSeqCommands(cmds: ISequenceCmd[]) {
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

private setTask(service: ITaskService, status: TaskStatus) {
  if (status === "spec") {
    this.addTaskSpec(service);
    return;
  }
  const activeService = service as ActiveTaskService;
  activeService.state = status;
  this.addActiveTaskSpec(activeService);
  return;
}

  private addTaskSpec(service: ITaskService) {
    const hash = this.taskHash(service);
    if (this.taskMap.has(hash)) {
      return;
    }
    this.taskMap.set(hash, service);
  }

  private addActiveTaskSpec(service: ActiveTaskService) {
//    logger.debug("WAAAAAAAAAAAAAAAAAAAAAAAA");
    const hash = this.taskHash(service);
    this.activeTaskMap.set(hash, service);
  /*  if (this.activeTaskMap.has(hash) === flase ) {
      this.activeTaskMap.set(hash, service);
      return;
    }
    */
  }

  private taskHash({ name, version, env }: { name: string, version: string, env: string }): string {
    return `${name}_${version}_${env}`;
  }
}
