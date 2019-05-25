/**
 * Config handles validation and extension of service runner default config  
 */
import Ajv from "ajv";
const ajv = new Ajv();
import metaSchema from "./service-runner-schema.json";
import defaultConfig from "../service-runner-config.json";
import { IConfig, IService, IServiceConfig, IServiceOSConfig, IServiceEnv } from "./service";
import _ from "lodash";
import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "Config");

export class Config {
  public config: IConfig;

  constructor(config: any) {
    if (_.isEmpty(config) === true) {
      this.validateConfig(defaultConfig);
      this.config = _.cloneDeep(defaultConfig) as IConfig;
    } else {
      this.config = this.extendConfig(defaultConfig, config) as IConfig;
    }
  }

  /**
   * Returns the templated config of a service for a given OS.
   *
   *
   * @param serviceName - Name of the service
   * @param os - Operating system name
   * @returns The config of a service scoped by OS and service name
   */
  public getService(serviceName: string, os: string): IService {
    const services = this.config.services.find((s: IServiceConfig) => s.name === serviceName) as IServiceConfig;
    if (services === undefined || services.os.hasOwnProperty(os) === false) {
      const errMsg = `Could not find service ${serviceName} with ${os}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
    const { rpcPort, name, environments, version } = services;
    const { commands, assets } = services.os[os] as IServiceOSConfig;
    return {
      rpcPort,
      name,
      environments,
      commands,
      assets,
      version,
    };
  }
  /**
   * Validates a service configuration against service runner schema
   *
   *
   * @param config - Takes a service config object of type IConfig 
   */
  public validateConfig(config: any) {
    ajv.validate(metaSchema, config);
    if (ajv.errors && ajv.errors.length > 0) {
      logger.error(ajv.errors);
      throw new Error(`Bad Schema extension`);
    }
  }

  /**
   * Returns the templated config of a service for a given OS.
   *
   *
   * @param serviceName - Name of the service 
   * @param os - Operating system name 
   * @returns The config of a service scoped by OS and service name 
   */
  public extendConfig(config: IConfig, other: any): IConfig {
    const mergedConfig = _.cloneDeep(config);
    other.services.forEach((svc: any) => {
      const serviceIdx = config.services.findIndex((s: IServiceConfig) => s.name === svc.name);
      if (serviceIdx > -1) {
        const service = mergedConfig.services[serviceIdx];
        svc.environments.every((env: any) => {
          const duplicateEnv = service.environments.find((e: any) => e.name === env.name);
          if (duplicateEnv) {
            const errMsg = `Environment name ${duplicateEnv.name} already exists choose unique name`;
            throw new Error(errMsg);
          }
        });
        service.environments = service.environments.concat(svc.environments);
      } else {
        mergedConfig.services.push(svc);
      }
    });
    this.validateConfig(mergedConfig);
    return mergedConfig;
  }

}
