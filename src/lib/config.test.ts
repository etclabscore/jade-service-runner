import { Config } from "./config";
const defaultConfig = require('../service-runner-config.json');
import _ from 'lodash';
import { IConfig } from "./service";

describe("configuration test", () =>{

  const mockConfig = {
    services: [
      {
        name: 'multi-geth',
        environments: [
          {
            name: "dev",
            args: {
              start: ["--datadir ${svc_runner_data_path}/multi-geth"],
              stop: [],
              teardown:[] 
            }
          }]
      },
      {
        name: 'eth-classic',
        environments: [
          {
            name: "dev",
            args: {
              start: ["--datadir ${svc_runner_data_path}/multi-geth"],
              stop: [],
              teardown:[]
            }
          }],
        os: {
          osx: {
            commands: {
              setup:[],
              start: "",
              stop: "",
              teardown: ""
            },
            assets:[]
          }
        }

      }
    ]
  }

  it("should construct valid configuration object", () => {
    const config = new Config({});
  })
  
  it("should support valid config extension", () => {
    new Config(mockConfig)
  })

  it("should retrieve service info", ()=> {
    const cfg = new Config(mockConfig)
    const svc = cfg.getService("multi-geth", "osx");
    expect(svc.name === "multi-geth").toBe(true)
    expect(svc.environments.length).toBe(4)
    expect(svc.environments.find((env:any)=> env.name === 'dev'))
    const defaultService = defaultConfig.services.find((service:any)=> service.name === "multi-geth")
    expect(_.isEqual(svc.commands,defaultService.os["osx"].commands)).toBe(true)
  })

  it("should throw on duplicate environment", ()=>{
    const badConfig = Object.assign({},mockConfig,{})
  })

  it("should throw on bad schema", ()=>{
    const badConfig = Object.assign({},mockConfig,{})
  })

  it("should retrieve installation information", ()=> {})


  it("should properly default configure multi-geth", ()=>{})

})