import {ITaskService, ActiveTaskService} from "./service";
import EventEmitter from "events";
import {Logger} from "winston";

export type TaskEvent = LaunchTaskEvent | PendingTaskEvent | ConsoleTaskEvent | HealthTaskEvent | ErrorTaskEvent | ExitTaskEvent;

export interface PendingTaskEvent {
  name: "pending";
  service: ITaskService;
}

export interface LaunchTaskEvent {
  name: "launch";
  service: ActiveTaskService;
  logger: Logger;
}

export interface ConsoleTaskEvent {
  name: "console";
  stdout?: string;
  stderr?: string;
  logger: Logger;
  service: ITaskService;
}

export interface HealthTaskEvent {
  name: "health";
  retries: number;
  logger: Logger;
  service: ActiveTaskService;
  interval: NodeJS.Timeout;
}

export interface ErrorTaskEvent {
  name: "error";
  error: Error;
  logger: Logger;
  service: ITaskService;
}

export interface ExitTaskEvent {
  name: "exit";
  error?: Error;
  code: number;
  logger: Logger;
  service: ActiveTaskService;
}

export class EventBus {
  private static QUEUE_NAME = "INTERNAL_NOTIFICATIONS";
  private bus: EventEmitter;
  constructor(handler: (event: TaskEvent) => void, bus: EventEmitter = new EventEmitter()) {
    this.bus = bus;
    this.bus.addListener(EventBus.QUEUE_NAME, handler);
  }
  public emit(event: TaskEvent) {
    this.bus.emit(EventBus.QUEUE_NAME, event);
  }
}
