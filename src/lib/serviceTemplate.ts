/**
 * The serviceTemplate module handles resolving any templated
 * service configuration, allocating dynamic ports for services.
 */
import { makeLogger } from "./logging";
import { template } from "lodash";
import {ITaskService, ActiveTaskService} from "./service";
import {ISequenceCmd, IHealth } from "./service";
import { getFreePorts } from "./util";

const logger = makeLogger("ServiceRunner", "RenderServiceTemplate");

/**
 * Starts an installed service using the service configuration and manifest entry, and
 * returns service configuration information.
 *
 *
 * @param service - Templated spec of the service
 * @returns The rendered version of the service configuration
 */
export async function renderService(service: ITaskService): Promise<ActiveTaskService> {
  logger.debug(`rendering service config for ${service.name}`);
  const ports = await getFreePorts();
  const SERVICE_DIR = service.path;
  const dynamicVar = { ...ports, SERVICE_DIR};
  const renderArgs = (cmds: string[]) => cmds.map((cmd) => template(cmd)({ ...dynamicVar }));
  const renderCmd = (cmd: string) => template(cmd)({ ...dynamicVar });
  const renderSequenceCmd = (seqCmds: ISequenceCmd[]) => seqCmds.map((cmd) => {
    return {
      args: renderArgs(cmd.args),
      cmd: renderCmd(cmd.cmd),
    };
  });

  const command = {
    setup: renderSequenceCmd(service.commands.setup),
    start: renderCmd(service.commands.start),
    stop: renderCmd(service.commands.stop),
    teardown: renderCmd(service.commands.teardown),
  };

  const args = {
    start: renderArgs(service.args.start),
    stop: renderArgs(service.args.stop),
    teardown: renderArgs(service.args.teardown),
  };
  let health: IHealth | undefined;
  if (service.health) {
    health = {
      ...service.health,
      port: renderCmd(service.health.port),
    };
  }

  const rpcPort = template(service.rpcPort)({ ...dynamicVar });
  logger.debug(`rendered service config for ${service.name}`);
  return {
    ...service,
    commands: command,
    rpcPort,
    health,
    state: "pending",
    args,
  };
}
