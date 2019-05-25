/**
 * This handles the routing for the RPC server, exposing the methods that the server handles  
 */
import { Installer } from "../lib/installer";
import { TaskManager } from "../lib/task";
import { IMethodMapping } from "@open-rpc/server-js/build/router";
import { makeLogger } from "../lib/logging";
const logger = makeLogger("ServiceRunner", "Routes");

/**
 * Returns the MethodMapping for the RPC Server essentially the routes.
 *
 *
 * @param installer - Installer for installing services 
 * @param taskManager - TaskManager for launching services 
 * @returns The config of a service scoped by OS and service name
 */
export const methods = (installer: Installer, taskManager: TaskManager): IMethodMapping => {

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
    },
    listInstalledServices: async () => {
      const mf = await installer.repo.getManifest();
      if (mf.services === undefined) { return []; }
      return mf.services.map((service) => ({ name: service.name, version: service.version }));
    },

    listRunningServices: async () => {
      return taskManager.listActiveServices();
    },

    startService: async (name: string, version: string, env: string) => {
      logger.info(`starting service ${name}`);
      const service = await taskManager.startService(name, version, env);
      logger.info(`started service ${service.name}`);
      return service;
    },
  };

};
