import ServiceRunner from "../src/generated-client/typescript/src";
const client = new ServiceRunner({
  transport: {
    type: "http",
    port: 8002,
    host: "localhost",
  },
});
client.installService("multi-geth", "1.9.0")
  .then(() => client.listInstalledServices())
  .then(() => client.listRunningServices())
  .then(console.log) //tslint:disable-line
  .then(() => client.startService("multi-geth", "1.9.0", "mainnet"))
  .then(console.log)//tslint:disable-line
  .then(() => client.listRunningServices())
  .then(console.log)//tslint:disable-line
  .catch((e) => {
    console.log(e);//tslint:disable-line
    throw e;
  });
