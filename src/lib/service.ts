export interface IService {
  name:string,
  rpcPort: string,
  version:string,
  environments: IServiceEnv[] 
  commands: IArgs 
  assets: string[] 
}
export interface IConfig {
  "$schema": string,
  services: IServiceConfig[]
}
export interface IServiceConfig {
  name: string,
  rpcPort: string,
  environments : IServiceEnv[]   
  os: {
    [key:string]: IServiceOSConfig | undefined, 
     osx?: IServiceOSConfig,
     windows?: IServiceOSConfig,
     linux?: IServiceOSConfig
  }
  version: string
}
export interface IServiceOSConfig {
    commands: IArgs
    assets: string[]
}

export interface IServiceEnv {
 name: string 
 args: IArgs 
}

export interface IArgs{
   start: string
   stop: string
   teardown: string
 }