/**
 * Config handles validation and extension of service runner default config
 */
import Ajv from "ajv";
const ajv = new Ajv();
import metaSchema from "./service-runner-schema.json";
import defaultConfig from "../service-runner-config.json";
import _ from "lodash";
import { makeLogger } from "./logging";
const logger = makeLogger("ServiceRunner", "Config");

export interface Service {
  name: string;
  rpcPort: string;
  version: string;
  environments: ServiceEnv[];
  commands: Commands;
  assets: string[];
}

export interface ServiceDesc {
  name: string;
  version: string;
  environments: string[];
}

export interface Health {
  port: string;
  protocol: "udp" | "tcp";
  retries: number;
  interval: number;
}

export interface ServiceRunner {
  "$schema": string;
  services: Services[];
}

export interface Services {
  name: string;
  rpcPort: string;
  environments: ServiceEnv[];
  os: {
    [key: string]: ServiceOS | undefined,
    osx?: ServiceOS,
    windows?: ServiceOS,
    linux?: ServiceOS,
  };
  version: string;
}

export interface ServiceOS {
  commands: Commands;
  assets: string[];
}

export interface ServiceEnv {
  name: string;
  args: EnvArgs;
  health?: Health;
}

export interface EnvArgs {
  start: string[];
  stop: string[];
  teardown: string[];
}

export interface Commands {

  setup: SequenceCmd[];
  start: string;
  stop: string;
  teardown: string;
}

export interface SequenceCmd {
  cmd: string;
  args: string[];
}

export class Config {
  public config: ServiceRunner;

  constructor(config: any) {
    if (_.isEmpty(config) === true) {
      this.validateConfig(defaultConfig);
      this.config = _.cloneDeep(defaultConfig) as ServiceRunner;
    } else {
      this.config = this.extendConfig(defaultConfig as ServiceRunner, config) as ServiceRunner;
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
  public getService(serviceName: string, os: string): Service {
    const services = this.config.services.find((s: Services) => s.name === serviceName) as Services;
    if (services === undefined || services.os.hasOwnProperty(os) === false) {
      const errMsg = `Could not find service ${serviceName} with ${os}`;
      logger.error(errMsg);
      throw new Error(errMsg);
    }
    const { rpcPort, name, environments, version } = services;
    const { commands, assets } = services.os[os] as ServiceOS;
    return {
      rpcPort,
      name,
      environments,
      commands,
      assets,
      version,
    };
  }

  public getAvailableServices(os: string): ServiceDesc[] {
    const services = this.config.services.filter((service) => service.os.hasOwnProperty(os) === true);
    return services.map((service) => {
      const { name, version } = service;
      const environments = service.environments.map((env) => env.name);
      return { name, environments, version };
    });
  }
  /**
   * Validates a service configuration against service runner schema
   *
   *
   * @param config - Takes a service config object of type ServiceRunnerConfig
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
  public extendConfig(config: ServiceRunner, other: any): ServiceRunner {
    const mergedConfig = _.cloneDeep(config);
    try {
      other.services.forEach((svc: any) => {
        const serviceIdx = config.services.findIndex((s: Services) => s.name === svc.name);
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
    } catch (e) {
      logger.error("Could not parse config");
      throw e;
    }
  }

}
