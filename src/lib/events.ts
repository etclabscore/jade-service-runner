import {ITaskService, ActiveTaskService} from "./service";
import EventEmitter from "events";
import {Logger} from "winston";
/*
 TaskEvent describes the union type of all process management related tasks
*/
export type TaskEvent = LaunchTaskEvent | PendingTaskEvent | ConsoleTaskEvent | HealthTaskEvent | ErrorTaskEvent | ExitTaskEvent | TerminateTaskEvent | StopTaskEvent;

/*
 * PendingTaskEvent describes a task that has been created, and rendered, but has not been launched.
*/
export interface PendingTaskEvent {
  name: "pending";
  service: ITaskService;
}
/*
 * LaunchTaskEvent describes an event that occurs when a task has been created, and template converted but has not been launched.
*/
export interface LaunchTaskEvent {
  name: "launch";
  service: ActiveTaskService;
  logger: Logger;
}
/*
 * ConsoleTaskEvent describes an event that occurs when a task has output on stdout or stderr.
 */
export interface ConsoleTaskEvent {
  name: "console";
  stdout?: string;
  stderr?: string;
  logger: Logger;
  service: ITaskService;
}
/*
 * HealthTaskEvent describes an event that occurs when a healthcheck is required to be prefored.
 */
export interface HealthTaskEvent {
  name: "health";
  logger: Logger;
  service: ActiveTaskService;
}
/**
 * ErrorTaskEvent describes an event that occurs when a fatal error has occured with a task that is not related to an exit.
 */
export interface ErrorTaskEvent {
  name: "error";
  error: Error;
  logger: Logger;
  service: ITaskService;
}
/**
 * StopTaskEvent describes an event that triggers a task to terminate.
 */

export type StopTaskReason = "health" | "unknown";
export interface StopTaskEvent {
  name: "stop";
  reason: StopTaskReason;
  logger: Logger;
  service: ActiveTaskService;
}
/**
 * TerminateTaskEvent describes an event that occurs when a tasks exits.
 */
export interface TerminateTaskEvent {
  name: "terminate";
  service: ActiveTaskService;
}
/**
 * ExitTaskEvent describes an event that occurs when a tasks exits.
 */
export interface ExitTaskEvent {
  name: "exit";
  error?: Error;
  code: number;
  logger: Logger;
  service: ActiveTaskService;
}
/**
 * EventBus is a message bus for internal notifications related to process management
 * The intent is that EventBus is utilized by TaskProcessManager to handle process state transitions
 * and is the only source of a process state transition.
 */
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
