import { ServiceSpec, ActiveServiceSpec } from "./service";
import { StrictEventEmitter } from "strict-event-emitter-types";
import EventEmitter from "events";
import { Logger } from "winston";
import { Protocol } from "./util";
/**
 * ExternalServiceNotification - describes notifications that are meant for use outside of the internal
 * service process management
 */
export interface ExternalServiceNotification {
  protocol: Protocol;
  rpcPort: string;
  version: string;
  name: string;
  env: string;
}
/**
 * ExternalServiceNotificationEvents - describes notifications that are meant for use outside of the internal
 * service process management, ex. its useful for the proxy router to subscribe to these events
 */
export interface ExternalServiceNotificationEvents {
  launched: (notification: ExternalServiceNotification) => void;
  terminated: (notification: ExternalServiceNotification) => void;
}
export type ExternalServiceNotifications = StrictEventEmitter<EventEmitter, ExternalServiceNotificationEvents>;
/*
 ServiceEvent describes the union type of all process management related events
*/
export type ServiceEvent = LaunchServiceEvent | PendingServiceEvent | ConsoleServiceEvent | HealthServiceEvent | ErrorServiceEvent | ExitServiceEvent | TerminateServiceEvent | StopServiceEvent;

/*
 * PendingServiceEvent describes a service that has been created, and rendered, but has not been launched.
*/
export interface PendingServiceEvent {
  name: "pending";
  service: ServiceSpec;
}
/*
 * LaunchServiceEvent describes an event that occurs when a service has been created, and template converted but has not been launched.
*/
export interface LaunchServiceEvent {
  name: "launch";
  service: ActiveServiceSpec;
  logger: Logger;
}
/*
 * ConsoleServiceEvent describes an event that occurs when a service has output on stdout or stderr.
 */
export interface ConsoleServiceEvent {
  name: "console";
  stdout?: string;
  stderr?: string;
  logger: Logger;
  service: ServiceSpec;
}
/*
 * HealthServiceEvent describes an event that occurs when a healthcheck is required to be prefored.
 */
export interface HealthServiceEvent {
  name: "health";
  logger: Logger;
  service: ActiveServiceSpec;
}
/**
 * ErrorServiceEvent describes an event that occurs when a fatal error has occured with a service that is not related to an exit.
 */
export interface ErrorServiceEvent {
  name: "error";
  error: Error;
  logger: Logger;
  service: ServiceSpec;
}
/**
 * StopServiceEvent describes an event that triggers a service to terminate.
 */

export type StopServiceReason = "health" | "unknown";
export interface StopServiceEvent {
  name: "stop";
  reason: StopServiceReason;
  logger: Logger;
  service: ActiveServiceSpec;
}
/**
 * TerminateServiceEvent describes an event that occurs when a service is terminated.
 */
export interface TerminateServiceEvent {
  name: "terminate";
  service: ActiveServiceSpec;
}
/**
 * ExitServiceEvent describes an event that occurs when a service exits.
 */
export interface ExitServiceEvent {
  name: "exit";
  error?: Error;
  code: number;
  logger: Logger;
  service: ActiveServiceSpec;
}
/**
 * EventBus is a message bus for internal notifications related to process management
 * The intent is that EventBus is utilized by ServiceProcessManager to handle process state transitions
 * and is the only source of a process state transition.
 */
export class EventBus {
  private static QUEUE_NAME = "INTERNAL_NOTIFICATIONS";
  private bus: EventEmitter;
  constructor(handler: (event: ServiceEvent) => void, bus: EventEmitter = new EventEmitter()) {
    this.bus = bus;
    this.bus.addListener(EventBus.QUEUE_NAME, handler);
  }
  public emit(event: ServiceEvent) {
    this.bus.emit(EventBus.QUEUE_NAME, event);
  }
}
