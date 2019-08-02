import _ from "lodash";
import { makeLogger } from "./lib/logging";
import { ServiceRunnerServer } from "./lib/serviceRunnerServer";
import { ProxyServer } from "./lib/proxyServer";
import { getAvailableTCPPort } from "./lib/util";
import { Router } from "./lib/router";
import { ConnectionInfo } from "./lib/connection";
export * from "./lib/connection";
export * from "./lib/serviceRunnerServer";
const logger = makeLogger("ServiceRunner", "startServiceRunner");
/**
 *
 * @param connections - set of connections for each protocol to set the external facing ports to connect with
 * @param dir - where services should live
 * @param extendedConfig - optional extended configuration
 */
export const startServiceRunner = async (connections: Set<ConnectionInfo>, dir: string, extendedConfig?: object): Promise<ServiceRunnerServer> => {
    const availablePort = await getAvailableTCPPort();
    const serviceRunnerServer = new ServiceRunnerServer(extendedConfig, dir, `${availablePort}`);
    const router = new Router(serviceRunnerServer.serviceManager.notifications);

    const proxy = new ProxyServer(connections, router);
    const port = Array.from(connections).find((conn) => conn.protocol === "http");
    logger.info(`Service Runner port starting on ${port}`);
    logger.debug(`Service Runner internal port starting on ${availablePort}`);
    await serviceRunnerServer.start();
    proxy.addServiceRunner(availablePort);
    const started = proxy.start();
    logger.info(`Service Runner started on ${port}`);
    return serviceRunnerServer;
};
