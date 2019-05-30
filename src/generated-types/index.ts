export type TServiceName = string;
export type TVersion = string;
export type TName = string;
export type TEnvironment = string;
export type TInstallSuccess = boolean;
export type TInstalledServices = {
  name?: string;
  version?: string;
  [k: string]: any;
}[];
export type TRunningServices = {
  env: string;
  rpcPort: string;
  name: string;
  version: string;
  path: string;
  commands: {
    setup: {
      cmd: string;
      args: string[];
      [k: string]: any;
    }[];
    start: string;
    stop: string;
    teardown: string;
    [k: string]: any;
  };
  args: {
    start: string[];
    stop: string[];
    teardown: string[];
    [k: string]: any;
  };
  running: boolean;
  [k: string]: any;
}[];
/**
 * An object that describes an instance of a service
 */
export interface IServiceConfig {
  env: string;
  rpcPort: string;
  name: string;
  version: string;
  path: string;
  commands: {
    setup: {
      cmd: string;
      args: string[];
      [k: string]: any;
    }[];
    start: string;
    stop: string;
    teardown: string;
    [k: string]: any;
  };
  args: {
    start: string[];
    stop: string[];
    teardown: string[];
    [k: string]: any;
  };
  running: boolean;
  [k: string]: any;
}

export type TInstallService = (serviceName: TServiceName, version: TVersion) => Promise<TInstallSuccess>;
export type TListInstalledServices = () => Promise<TInstalledServices>;
export type TListRunningServices = () => Promise<TRunningServices>;
export type TStartService = (name: TName, version: TVersion, environment: TEnvironment) => Promise<IServiceConfig>;