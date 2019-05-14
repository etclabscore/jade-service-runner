import { IService } from '../../src/lib/service'
import fs from 'fs-extra';
import http from 'http';
// construct extension for 2 new test services
export const mockServer = (file:string): Promise<http.Server>=>{
  return new Promise((resolve: (value: http.Server) => void) => {
      const testServer = http.createServer((req, res) => {
        const rs = fs.createReadStream(file)
        console.log("%j", req)
        if (!req.url) throw new Error("Request missing url")
        if (req.url.search("download") > 0) {
          res.writeHead(200, { 'Content-Type': 'application/binary' });
          rs.pipe(res)
          rs.on('close',()=>{
            res.end(null)
          })
          return
        }

        if (req.url.search("bad_response") > 0) {

        }

        if (req.url.search("timeout") > 0) {

        }
      })
      testServer.listen(0, ()=>{resolve(testServer)})
    })
}
export const mockConfig: any = {
  services: [
    {
      version: "1.0.0",
      name: "testService",
      rpcPort: "${DYNAMIC_TCP_PORT_1}",
      environments: [
        {
          name: "test",
          args: {
            start: ["--datadir", "${SERVICE_DIR}/datadir"],
            stop: [],
            teardown: [] 
          }
        }],
      os: {
        osx: {
          commands: {
            setup: [{
              cmd:"chmod",
              args: ["+x","./${SERVICE_DIR}/testService/testService1-osx"]
            }],
            start: "./${SERVICE_DIR}/testService/testService1-osx",
            stop: [],
            teardown: [] 
          }
        }
      }
    },
    {
      version: "1.0.0",
      name: 'testService2',
      environments: [
        {
          name: "dev",
          args: {
            start: ["--datadir", "multi-geth"],
            stop: [],
            teardown: [] 
          }
        }],
      os: {
        osx: {
          commands: {
            setup:[],
            start: "./testService",
            stop: "",
            teardown: ""
          }
        }
      }
    }]
  }