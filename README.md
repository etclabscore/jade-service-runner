![](https://www.etclabs.org/dist/resources/images/v2/logo-top.png)
Supported by [ETC Labs](https://www.etclabs.org/)


# Jade Service Runner - A JSON-RPC Service Manager

Service Runner is an opinionated JSON-RPC service manager, that provides daemonization, installation, and discovery for JSON-RPC based services.

Service Runner helps developers gain access to a user's locally run services. It provides users with a management and installation tool, that allows developers to discover  services and reliably request access to those services.

## Better dApp Development
Service Runner improves the dApp development cycle, by reducing the number of steps required for running services that are local to the user, in addition to  associated with relying on locally running JSON-RPC services. To do this effectively, Jade Service Runner supports the following:
  - Allows dApp developers to specify what services they'd like to use
  - Provides defaults for the services to run
  - Provices users with an easy installation path
  - Provides reliable discovery of pre-existing services run by the service runner
  - Provides OpenRPC interface to the Service Runnner functionality, as well as the underlying services
  - Allows dApp developers the ability to retrieve reliable JSON-RPC connection information from the service
  - Provides typed interfaces to develop applications against

## Getting Started
---------------

Install `jade-service-runner` using npm

```shell
npm install jade-service-runner
npm install jade-service-runner-client
```
Then require it into any module.

```js
const { ServiceRunner } = require('service-runner-client');
const EthereumJSONRPClient = require('ethereum-json-rpc-spec');
const client = new ServiceRunner({ transport: { type: "http", port: 8002, host: "localhost" } });
client.installService("multi-geth", "1.8.5")
  .then(() => client.listInstalledServices())
  .then(() => client.listRunningServices())
  .then(console.log)
  .then(() => client.startService("multi-geth", "1.8.5", "mainnet"))
  .then((multiGethConfig)=>{
  })
  .then(() => client.listRunningServices())
  .then(console.log)
  .catch((e) => {
    console.log(e);
    throw e;
  });
const { MultiGeth } = require('@multi-geth/types');
const serviceRunner = new ServiceRunner(new );
const serviceName='multi-geth';
const successful = await serviceRunner.installService(serviceName);
if(successful === false) throw new Error('Service not installed')
const serviceConfig = serviceRunner.start(serviceName, 'kotti');
const multiGeth = new MultiGeth(serviceConfig);
multiGeth.getBalance("0x0DEADBEEF")
```

To run the service runner.
Download and install the binary [here](https://here)

```shell
./jade-service-runner
```

or

```shell
cd  $PATH/jade-service-runner
npx jade-service-runner
```

# Contributing

How to contribute, build and release are outlined in [CONTRIBUTING.md](CONTRIBUTING.md), [BUILDING.md](BUILDING.md) and [RELEASING.md](RELEASING.md) respectively. Commits in this repository follow the [CONVENTIONAL_COMMITS.md](CONVENTIONAL_COMMITS.md) specification.
