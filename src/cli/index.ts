#!/usr/bin/env node
import program from "commander";
const version = require("../../../package.json").version; // tslint:disable-line
import { makeLogger } from "../lib/logging";
import { startServiceRunnerFromCLI } from "./commands";
import _ from "lodash";

const logger = makeLogger("ServiceRunner", "CLI");
program
  .version(version, "-v, --version")
  .option(
    "-c, --config <configFile>",
    "JSON file path pointing to a service runner config file",
  )
  .option(
    "-d, --dir <directory>",
    "Directory for storing services",
    "./services",
  )
  .option(
    "-p, --port <port>",
    "Set port for service runner",
    "8002",
  )
  .option(
    "-t, --test",
    "Test configuration",
  )
  .action(async () => {
    try {
      await startServiceRunnerFromCLI(program);
    } catch (e) {
      logger.error("Could not start service runner.");
      logger.debug(e.stack);
    }
  })
  .parse(process.argv);
