export interface IService {
  name:string,
  environments: [IServiceEnv] 
  commands: IArgs 
}

export interface IServiceConfig {
  name: string,
  environments : [IServiceEnv]   
  os: {
    [key:string]: IServiceOSConfig | undefined, 
     osx?: IServiceOSConfig,
     windows?: IServiceOSConfig,
     linux?: IServiceOSConfig
  }
}
export interface IServiceOSConfig {
    commands: IArgs
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