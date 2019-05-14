import { IService } from '../../src/lib/service'
import fs from 'fs-extra';
import net from 'net';
// construct extension for 2 new test services
export const mockServer = (file:string): Promise<net.Server>=>{
  return new Promise((resolve: (value: net.Server) => void) => {
    //@ts-ignore
      const testServer = net.createServer((req, res) => {
        const rs = fs.createReadStream(file)
        if (!req.url) throw new Error("Request missing url")
        if (req.url.search("download") > 0) {
          res.writeHead(200, { 'Content-Type': 'application/binary' });
          res.send(rs)
          return
        }

        if (req.url.search("bad_response") > 0) {

        }

        if (req.url.search("timeout") > 0) {

        }
      })
      testServer.listen(0, resolve(testServer))
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
            start: "--datadir ${SERVICE_DIR}/testService",
            stop: "",
            teardown: ""
          }
        }],
      os: {
        osx: {
          commands: {
            start: "./testService-osx",
            stop: "",
            teardown: ""
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
            start: "--datadir multi-geth",
            stop: "",
            teardown: ""
          }
        }],
      os: {
        osx: {
          commands: {
            start: "./testService -",
            stop: "",
            teardown: ""
          }
        }
      }
    }]
  }