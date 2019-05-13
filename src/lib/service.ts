export interface IService {
  name:string,
  version?:string,
  environments: [IServiceEnv] 
  commands: IArgs 
  assets: string[] 
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