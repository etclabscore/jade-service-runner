export type RPCString = string;
export type RPCBoolean = boolean;
export interface InstalledService {
  name?: RPCString;
  version?: RPCString;
  [k: string]: any;
}
export type InstalledServiceArray = InstalledService[];
export type RPCStringArray = RPCString[];
export interface SeqCommand {
  cmd: RPCString;
  args: RPCStringArray;
  [k: string]: any;
}
export type SeqCommandArray = SeqCommand[];
export interface Commands {
  setup: SeqCommandArray;
  start: RPCString;
  stop: RPCString;
  teardown: RPCString;
  [k: string]: any;
}
export interface EnvArgs {
  start: RPCStringArray;
  stop: RPCStringArray;
  teardown: RPCStringArray;
  [k: string]: any;
}
/**
 * An object that describes an instance of a service
 */
export interface TaskService {
  env: RPCString;
  rpcPort: RPCString;
  name: RPCString;
  version: RPCString;
  path: RPCString;
  commands: Commands;
  args: EnvArgs;
  running: RPCBoolean;
  [k: string]: any;
}
export type TaskServiceArray = TaskService[];
export type InstallService = (serviceName: RPCString, version: RPCString) => Promise<RPCBoolean>;
export type ListInstalledServices = () => Promise<InstalledServiceArray>;
export type ListRunningServices = () => Promise<TaskServiceArray>;
export type StartService = (name: RPCString, version: RPCString, environment: RPCString) => Promise<TaskService>;
