/*
import ServiceRunner from "../build/generated-client/typescript";
import EthClient from "../build/example-client/build";
const client = new ServiceRunner({
  transport: {
    type: "http",
    port: 8002,
    host: "localhost",
  },
});
const ethClient = new EthClient({
  transport: {
    host: "localhost",
    port: 8002,
    type: "http",
    path: "multi-geth/mainnet/1.9.0",
  },
});

console.log("starting client");
client.installService("multi-geth", "1.9.0")
  .then(() => client.listInstalledServices())
  .then(() => client.listRunningServices())
  .then(console.log) //tslint:disable-line
  .then(() => client.startService("multi-geth", "1.9.0", "mainnet"))
  .then(console.log)//tslint:disable-line
  .then(() => client.listRunningServices())
  .then(console.log)//tslint:disable-line
 client.startService("multi-geth", "1.9.0", "mainnet")
  .then(() => ethClient.eth_getBalance("0xc1912fee45d61c87cc5ea59dae31190fffff232d", "0x0"))
  .then(console.log)
  .catch((e) => {
    console.log(e);//tslint:disable-line
    throw e;
  });
  */
