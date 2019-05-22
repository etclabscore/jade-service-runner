import program from "commander";
import fs from "fs-extra";
const version = require("../../../package.json").version; // tslint:disable-line
import { ServiceRunnerServer } from "../";
import { makeLogger } from "./logging";
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
  .action(async () => {
    let dir = "./services";
    let extendedConfig: any;
    if (program.config) { extendedConfig = await fs.readJSON(program.config); }
    if (program.dir) { dir = program.dir; }
    const serviceRunnerServer = new ServiceRunnerServer(extendedConfig, dir, "8002");
    logger.info("Service Runner Started!");
    await serviceRunnerServer.start();
  })
  .parse(process.argv);
