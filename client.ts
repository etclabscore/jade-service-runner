/*const ServiceRunner = require('./build/client/typescript/build/index').default;
const client = new ServiceRunner({ transport: { type: "http", port: 8002, host: "localhost" } });
client.installService("multi-geth", "1.8.5")
  .then(() => client.listInstalledServices())
  .then(() => client.listRunningServices())
  .then(console.log)
  .then(() => client.startService("multi-geth", "1.8.5", "mainnet"))
  .then(console.log)
  .then(() => client.listRunningServices())
  .then(console.log)
  .catch((e) => {
    console.log(e);
    throw e;
  });
  */