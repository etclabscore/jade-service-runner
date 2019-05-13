import ServiceRunner from "jade-service-runner-package";
const client = new ServiceRunner({transport: {type:"http", port: 8002}})
client.installService("multi-geth","1.8.5")
.then((x)=>console.log(x))
