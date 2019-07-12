import fs from "fs-extra";
import _ from "lodash";
import { Config } from "../lib/config";
import { makeLogger } from "../lib/logging";
import { Command } from "commander";
import { ConnectionInfo } from "../lib/connection";
import { startServiceRunner } from "..";
import { ServiceRunnerServer } from "../lib/serviceRunnerServer";
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
  return { port, dir, test: prog.test, extendedConfig };
};

const testConfiguration = async (extendedConfig: any) => {
  // tslint:disable-next-line:no-unused-expression
  new Config(extendedConfig);
  logger.info(`Configuration is valid!`);
};

const launchCommands = async ({ port, dir, extendedConfig }: ParsedCommands): Promise<ServiceRunnerServer> => {
  const connections = new Set<ConnectionInfo>([{ host: "localhost", port: parseInt(port, 10), protocol: "http" }]);
  return startServiceRunner(connections, dir, extendedConfig);
};
/**
 * startServiceRunnerFromCLI launches the service runner with command line arguments
 * @param program - are the commandline arguments
 */
export const startServiceRunnerFromCLI = async (program: any): Promise<void> => {
  const commands = await parseCommands(program);
  if (commands.test) {
    return testConfiguration(commands.extendedConfig);
  }
  launchCommands(commands);
};
