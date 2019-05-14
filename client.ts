import ServiceRunner from "jade-service-runner-package";
const client = new ServiceRunner({transport: {type:"http", port: 8002}})
client.installService("multi-geth","1.8.5")
.then(()=>client.listInstalledServices())
.then(()=>client.listRunningServices())
.then(console.log)
.then(()=>client.startService("multi-geth","1.8.5","mainnet"))
.then(console.log)
.then(()=>client.listRunningServices())
.then(console.log)
.catch((e)=>{
  console.log(e)
  throw e
})