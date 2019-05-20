import { Installer } from "../lib/installer";
import { TaskManager } from "../lib/task";
import { IMethodMapping } from "@open-rpc/server-js/build/router";

export const methods = (installer: Installer, taskManager: TaskManager): IMethodMapping => {

  return {

    installService: async (name: string, version: string) => {
      try {
        await installer.install(name, version);
      } catch (e) {
        console.error(`Could not install ${name} ${e}`);
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
      console.log(`starting service ${name}`);
      await taskManager.startService(name, version, env);
    },
  };

};
