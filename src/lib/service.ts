import { StrictEventEmitter } from "strict-event-emitter-types";
import { EventEmitter } from "events";
import { ChildProcessWithoutNullStreams } from "child_process";
import { Health, Commands, EnvArgs } from "./config";
/**
 * ServiceNotifcationEvents are a set of service specific events that can be subscribed to.
 */
export interface ServiceNotificationEvents {
  launched: (service: ServiceSpec) => void;
  stopped: (service: ActiveServiceSpec) => void;
  terminated: (service: ActiveServiceSpec) => void;
  pending: (service: ActiveServiceSpec) => void;
}
/*
 * ServiceSpec describes a service description that can be used to render a process, then subsequently launch a process.
*/
export interface ServiceSpec {
  env: string;
  rpcPort: string;
  name: string;
  version: string;
  path: string;
  commands: Commands;
  health?: Health;
  args: EnvArgs;
  notifications: StrictEventEmitter<EventEmitter, ServiceNotificationEvents>;
}
/**
 * ActiveServicSpec describes a service description that is currently running, including its resolved parameters if templated parameters were used.
 */
export interface ActiveServiceSpec extends ServiceSpec {
  state: ServiceState;
  process?: ChildProcessWithoutNullStreams;
}

export type ServiceState = "running" | "stopped" | "pending";
export type ServiceStatus = "spec" | ServiceState;
