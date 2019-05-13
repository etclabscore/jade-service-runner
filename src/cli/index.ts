import program from 'commander'
import fs, { readFile } from 'fs-extra';
const version = require("../../../package.json").version; // tslint:disable-line
import {ServiceRunnerServer} from '../'
import {Config} from '../lib/config'
import { Repo } from '../lib/repo';
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
    let dir = './services';
    let extendedConfig:any = undefined;
    if(program.config) extendedConfig = await fs.readJSON(program.config);
    if(program.dir) dir = program.dir
    const serviceRunnerServer = new ServiceRunnerServer(extendedConfig, dir, "8002")
    console.log("Done!"); // tslint:disable-line
    await serviceRunnerServer.start()
    })
  .parse(process.argv);