import { StrictEventEmitter } from "strict-event-emitter-types";
import { EventEmitter } from "events";

export interface IService {
  name: string;
  rpcPort: string;
  version: string;
  environments: IServiceEnv[];
  commands: ICommands;
  assets: string[];
}

export interface IHealth {
  port: string;
  proto: string;
  retries: number;
  interval: number;
}

export interface IConfig {
  "$schema": string;
  services: IServiceConfig[];
}

export interface IServiceConfig {
  name: string;
  rpcPort: string;
  environments: IServiceEnv[];
  os: {
    [key: string]: IServiceOSConfig | undefined,
    osx?: IServiceOSConfig,
    windows?: IServiceOSConfig,
    linux?: IServiceOSConfig,
  };
  version: string;
}
export interface IServiceOSConfig {
  commands: ICommands;
  assets: string[];
}

export interface IServiceEnv {
  name: string;
  args: IEnvArgs;
  health?: IHealth;
}

export interface IEnvArgs {
  start: string[];
  stop: string[];
  teardown: string[];
}

export interface ICommands {

  setup: ISequenceCmd[];
  start: string;
  stop: string;
  teardown: string;
}

export interface ISequenceCmd {
  cmd: string;
  args: string[];
}

export interface TaskNotificationEvents {
  launched: (service: ITaskService) => void;
  terminated: (service: ITaskService) => void;
  pending: (service: ActiveTaskService) => void;
}

export interface ITaskService {
  env: string;
  rpcPort: string;
  name: string;
  version: string;
  path: string;
  commands: ICommands;
  health?: IHealth;
  args: IEnvArgs;
  notifications: StrictEventEmitter<EventEmitter, TaskNotificationEvents>;
}

export interface ActiveTaskService extends ITaskService {
  state: TaskState;
  pid?: number;
}

export type TaskState = "running" | "stopped" | "pending";
export type TaskStatus = "spec" | TaskState;
