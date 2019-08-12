/**
 * This handles the routing for the RPC server, exposing the methods that the server handles
 */
import { Installer } from "../lib/installer";
import { ServiceManager } from "../lib/serviceManager";
import { ServiceDesc, Service } from "../lib/config";
import { makeLogger } from "../lib/logging";
import { InstallService, ListInstalledServices, ListRunningServices, StartService, ListServices } from "../generated-types";
import { IMethodMapping } from "@open-rpc/server-js/build/router";
import { getOS } from "../lib/util";
const logger = makeLogger("ServiceRunner", "Routes");

export interface ServiceMethodMapping extends IMethodMapping {
  installService: InstallService;
  listServices: ListServices;
  listInstalledServices: ListInstalledServices;
  listRunningServices: ListRunningServices;
  startService: StartService;
}
/**
 * Returns the MethodMapping for the RPC Server essentially the routes.
 *
 *
 * @param installer - Installer for installing services
 * @param serviceManager - ServiceManager for launching services
 * @returns The config of a service scoped by OS and service name
 */
export const methods = (installer: Installer, serviceManager: ServiceManager): ServiceMethodMapping => {

  const getAvailableServices = async (): Promise<ServiceDesc[]> => {
    logger.debug("listing available services");
    const services = serviceManager.config.getAvailableServices(getOS());
    return services.map((s) => Object.assign(s, { state: "available" }));
  };

  const getInstalledServices = async (): Promise<ServiceDesc[]> => {
    const mf = await installer.repo.getManifest();
    if (mf.services === undefined) { return []; }
    logger.debug("got services and returning");
    return mf.services.map((service) => {
      const svc = serviceManager.config.getService(service.name, getOS());
      return { state: "installed", name: service.name, version: service.version, environments: svc.environments.map((env) => env.name) };
    });
  };

  const getRunningServices = async (): Promise<ServiceDesc[]> => {
    return serviceManager.listActiveServices().map((service) => {
      const { name, version, env } = service;
      return { name, state: "running", environments: [env], version };
    });
  };

  return {

    installService: async (name: string, version: string) => {
      try {
        logger.info(`installing ${name} ${version}`);
        await installer.install(name, version);
        logger.info(`installed ${name} ${version}`);
      } catch (e) {
        logger.error(`Could not install ${name} ${e}`);
        throw e;
      }
      return true;
    },
    listServices: async (filter) => {
      logger.debug("listing services");
      switch (filter) {
        case "all":
          const avail: ServiceDesc[] = await getAvailableServices();
          const install = await getInstalledServices();
          const running = await getRunningServices();
          return avail.concat(install, running);
        case "available":
          return getAvailableServices();
        case "installed":
          return getInstalledServices();
        case "running":
          return getRunningServices();
      }
    },
    listInstalledServices: async () => {
      logger.debug("listing installed services");
      const mf = await installer.repo.getManifest();
      if (mf.services === undefined) { return []; }
      logger.debug("got services and returning");
      return mf.services.map((service) => ({ name: service.name, version: service.version }));
    },

    listRunningServices: async () => {
      return serviceManager.listActiveServices();
    },

    startService: async (name: string, version: string, env: string) => {
      logger.info(`starting service ${name}`);
      const service = await serviceManager.startService(name, version, env);
      logger.info(`started service ${service.name}`);
      return service;
    },
  };

};
