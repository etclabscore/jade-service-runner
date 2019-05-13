import { Config } from '../lib/config'
import { Installer } from '../lib/installer'
import { TaskManager } from '../lib/task'
import { Repo } from '../lib/repo';
import { getOS } from '../lib/util';
import { IMethodMapping } from "@open-rpc/server-js/build/router";
import { AsyncResource } from 'async_hooks';

export const methods = (installer: Installer, taskManager: TaskManager): IMethodMapping => {

  return {

    installService: async (name: string, version: string) => {
      try {
        await installer.install(name, version)
      } catch (e) {
        console.error(`Could not install ${name} ${e}`)
        throw e
      }
    },

    startService: async (name: string, env: string) =>{
      await taskManager.startService(name, env);
    }
  }

}