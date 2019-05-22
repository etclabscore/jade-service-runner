import program from "commander";
import fs from "fs-extra";
const version = require("../../../package.json").version; // tslint:disable-line
import { ServiceRunnerServer } from "../";
import { makeLogger } from "../lib/logging";
const logger = makeLogger("ServiceRunner", "CLI");
program
  .version(version, "-v, --version")
  .option(
    "-c, --config",
    "JSON file path pointing to a service runner config file",
    "./build/src/service-runner-config.json",
  )
  .option(
    "-d, --dir",
    "Directory for storing services",
    "./services",
  )
  .option(
    "-p, --port",
    "Set port for service runner",
    "8002",
  )
  .action(async () => {
    let dir = "./services";
    let port = "8002";
    let extendedConfig: any;
    if (program.config) { extendedConfig = await fs.readJSON(program.config); }
    if (program.dir) { dir = program.dir; }
    if (program.port) { port = program.port; }
    const serviceRunnerServer = new ServiceRunnerServer(extendedConfig, dir, port);
    logger.info(`Service Runner started on ${port}`);
    await serviceRunnerServer.start();
  })
  .parse(process.argv);
