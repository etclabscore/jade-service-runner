export interface IService {
  name: string;
  rpcPort: string;
  version: string;
  environments: IServiceEnv[];
  commands: ICommands;
  assets: string[];
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
