const Ajv = require('ajv');
const ajv = new Ajv();
const metaSchema = require('./service-runner-schema.json')
const defaultConfig = require('../service-runner-config.json');
import {IService, IServiceConfig, IArgs, IServiceOSConfig, IServiceEnv} from './service';
import _ from 'lodash';

export enum OSTypes {
  OSX = "osx",
  WINDOWS = "windows",
  LINUX = "linux"
}

export class Config {
  config:any;

  constructor(config: any){
    if (_.isEmpty(config) === true) {
      this.validateConfig(defaultConfig)
      this.config = _.cloneDeep(defaultConfig)
    }else{
      this.config = this.extendConfig(defaultConfig, config)
    }
  }

  getService(serviceName:string, os:string): IService {
     const services = this.config.services.find((s:IServiceEnv)=> s.name === serviceName) as IServiceConfig;    
     if(services === undefined || services.os.hasOwnProperty(os) === false) {
       const errMsg = `Could not find service ${serviceName} with ${os}`
       console.error(errMsg)
       throw new Error(errMsg);
     }     
    const { name, environments } = services; 
    const  {commands, assets}  = services.os[os] as IServiceOSConfig 
    return {
      name,
      environments,
      commands,
      assets
    }

  }

  validateConfig(config:any) {
    ajv.validate(metaSchema, config);
    if (ajv.errors && ajv.errors.length > 0) {
      console.error(ajv.errors);
      throw new Error(`Bad Schema extension`);
    }
  }

  extendConfig(config:any, other: any): any {
    const mergedConfig = _.cloneDeep(config);
    other.services.forEach((svc: any)=> {
      const serviceIdx = config.services.findIndex((s: IServiceEnv) => s.name === svc.name);
      if(serviceIdx > -1) {
        const service = mergedConfig.services[serviceIdx]
        svc.environments.every((env: any) => {
          const duplicateEnv = service.environments.find((e: any) => e.name === env.name)
          if (duplicateEnv) {
            debugger
            const errMsg = `Environment name ${duplicateEnv.name} already exists choose unique name`;
            throw new Error(errMsg);
          }
        })
        service.environments = service.environments.concat(svc.environments)
      }else 
        mergedConfig.services.push(svc)
    })
//    console.log(JSON.stringify(mergedConfig,null, 2))
    this.validateConfig(mergedConfig);
    return mergedConfig;
   }

}