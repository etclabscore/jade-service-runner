import { testServer } from "./server";
import { SimpleMath } from "./client";
import program from "commander";
program
  .option(
    "-p, --port <port>",
    "Set port for simple math",
    "8900",
  )
  .option(
    "-m, --mode <mode>",
    "Set protocol for simple math ws, wss, http, https",
    "ws",
  )
  .action(async () => {
    const port = parseInt(program.port, 10);
    const server = testServer(port, program.mode, SimpleMath.openrpcDocument, {});
    // tslint:disable-next-line:no-console
    console.log(`simplemath test server starting with ${program.mode} - ${program.port}`);
    server.start();
    // tslint:disable-next-line:no-console
    console.log("simplemath test server started");
  })
  .parse(process.argv);
