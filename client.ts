import ServiceRunner from "jade-service-runner-package";
const client = new ServiceRunner({transport: {type:"http", port: 8002}})
client.installService("hiphop","1")
.then((x)=>console.log(x))
