/**
 *  TaskProcessManager launchs and manage services, keeping services that have been
 *  launched alive, until the ServiceRunner process is killed explictly.
 *  TaskProcessManager keeps a record of processes launched, and processes installed. It creates a unidirectional flow for
 *  process run by service runner. It acts as a sink for processes that are being launched, and includes providing hooks for
 *  downstream consumers to subscribe to process level events.
 */
import { ITaskService, ActiveTaskService, IHealth, ISequenceCmd, TaskStatus } from "./service";
import * as events from "./events";
import { spawn } from "child_process";
import { renderService } from "./serviceTemplate";
import { makeLogger } from "./logging";

const logger = makeLogger("ServiceRunner", "TaskProcessManager");

export class TaskProcessManager {

  public taskMap: Map<string, ITaskService>;
  public activeTaskMap: Map<string, ActiveTaskService>;
  private notifications: events.EventBus;
  constructor() {
    this.taskMap = new Map<string, ITaskService>();
    this.activeTaskMap = new Map<string, ActiveTaskService>();
    this.notifications = new events.EventBus(this.processTask.bind(this));
  }

  /**
   * Launches a service, writing the service to an in memory map of active and templated processes.
   * It spawns new tasks, and catches errors and SIGTERM signals to then re spawn itself. It
   * returns a fully rendered config
   *
   *
   * @param service - Configuration for a templated service
   * @returns The rendered configuration for a service
   */
  public async launchTask(service: ITaskService): Promise<ITaskService> {

    return new Promise((resolve) => {
      const pendingTask: events.PendingTaskEvent = { name: "pending", service };
      this.notifications.emit(pendingTask);
      service.notifications.on("launched", (svc) => {
        resolve(svc);
      });
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

  private handleExitEvent(event: events.ExitTaskEvent) {
    const {service, error} = event;
    const exitMsg = `${service.name}: child process exited`;
    this.setTask(service, "stopped");
    if (error) {
      event.logger.error(`${exitMsg} with err ${error}`);
      return;
    }
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
    logger.info(`Launched service with ${JSON.stringify(service)}`);

    service.pid = child.pid;
    this.setTask(service, "running");
    service.notifications.emit("launched", service);
  }

  private handleHealthEvent(event: events.HealthTaskEvent) {
    // TODO
  }

  private async processTask(event: events.TaskEvent) {
    switch (event.name) {
      case "console":
        this.handleConsoleEvent(event);
        return;
      case "error":
        throw new Error(`Could not handle task error ${event.error}`);
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
        this.handleHealthEvent(event);
        return;
    }
  }

  private async handlePendingEvent(event: events.PendingTaskEvent) {
    const { service } = event;
    await this.setTask(service, "spec");
    const renderedService = await renderService(service);
    this.setTask(renderedService, "pending");
    const serviceLogger = makeLogger(renderedService.name, "Child Task");
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
    const hash = this.taskHash(service);
    if (this.activeTaskMap.has(hash) === false) {
      this.taskMap.set(hash, service);
      return;
    }
  }

  private taskHash(service: ITaskService): string {
    return `${service.name}_${service.version}_${service.env}`;
  }
}
