import fs from "fs-extra";
import _ from "lodash";
import { Config } from "../lib/config";
import { makeLogger } from "src/lib/logging";
import { Command } from "commander";
import { ServiceRunnerServer } from "../";
const logger = makeLogger("ServiceRunner", "Commands");

interface ParsedCommands {
  port: string;
  dir: string;
  extendedConfig: any;
  test: boolean;
}

const parseCommands = async (prog: Command) => {
  let dir = "./services";
  let port = "8002";
  let extendedConfig: any;
  if (prog.config) { extendedConfig = await fs.readJSON(prog.config); }
  if (prog.dir) { dir = prog.dir; }
  if (prog.port) { port = prog.port; }
  return {port, dir, test: prog.test && !_.isEmpty(prog.config), extendedConfig};
};

const testConfiguration = async (extendedConfig: any) => {
  const cfg = new Config(extendedConfig);
  logger.info(`Configuration is valid!`);
};

const launchCommands = async ({port, dir, extendedConfig}: ParsedCommands) => {
    const serviceRunnerServer = new ServiceRunnerServer(extendedConfig, dir, port);
    logger.info(`Service Runner starting on ${port}`);
    const started = serviceRunnerServer.start();
    logger.info(`Service Runner started on ${port}`);
    return started;
};

export const startServiceRunner = async (program: any): Promise<void> => {
  const commands = await parseCommands(program);
  if (commands.test) {
    return testConfiguration(commands.extendedConfig);
  }
  return launchCommands(commands);
};
