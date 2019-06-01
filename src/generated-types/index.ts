export type StringWxzVcTo3 = string;
export type BooleanQg3XFxa5 = boolean;
export interface ObjectVZsrKceH {
  name?: StringWxzVcTo3;
  version?: StringWxzVcTo3;
  [k: string]: any;
}
export type ArrayKvcc3Slb = ObjectVZsrKceH[];
export type ArrayFoEQPbEQ = StringWxzVcTo3[];
export interface ObjectD8RkBGZG {
  cmd: StringWxzVcTo3;
  args: ArrayFoEQPbEQ;
  [k: string]: any;
}
export type ArrayQfe0DQgu = ObjectD8RkBGZG[];
export interface ObjectHuetvW0J {
  setup: ArrayQfe0DQgu;
  start: StringWxzVcTo3;
  stop: StringWxzVcTo3;
  teardown: StringWxzVcTo3;
  [k: string]: any;
}
export interface ObjectHqcFUS7M {
  start: ArrayFoEQPbEQ;
  stop: ArrayFoEQPbEQ;
  teardown: ArrayFoEQPbEQ;
  [k: string]: any;
}
/**
 * An object that describes an instance of a service
 */
export interface ObjectB03Ky6YK {
  env: StringWxzVcTo3;
  rpcPort: StringWxzVcTo3;
  name: StringWxzVcTo3;
  version: StringWxzVcTo3;
  path: StringWxzVcTo3;
  commands: ObjectHuetvW0J;
  args: ObjectHqcFUS7M;
  running: BooleanQg3XFxa5;
  [k: string]: any;
}
export type ArrayQv89Khbj = ObjectB03Ky6YK[];
export type InstallService = (serviceName: StringWxzVcTo3, version: StringWxzVcTo3) => Promise<BooleanQg3XFxa5>;
export type ListInstalledServices = () => Promise<ArrayKvcc3Slb>;
export type ListRunningServices = () => Promise<ArrayQv89Khbj>;
export type StartService = (name: StringWxzVcTo3, version: StringWxzVcTo3, environment: StringWxzVcTo3) => Promise<ObjectB03Ky6YK>;