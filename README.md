# Jade Service Runner - A JSON-RPC Service Manager

<p align="center">
<img height="256" width="256" src="https://github.com/etclabscore/jade-media-assets/raw/master/jade-logo-light/jade-logo-light%20(PNG)/256x256.png" />
</p>

<center>
  <span>
    <img alt="CircleCI branch" src="https://img.shields.io/circleci/project/github/etclabscore/jade-service-runner/master.svg">
    <img src="https://codecov.io/gh/etclabscore/jade-service-runner/branch/master/graph/badge.svg" />
    <img alt="Dependabot status" src="https://api.dependabot.com/badges/status?host=github&repo=etclabscore/jade-service-runner" />
    <img alt="Chat on Discord" src="https://img.shields.io/badge/chat-on%20discord-7289da.svg" />
    <img alt="npm" src="https://img.shields.io/npm/dt/@etclabscore/jade-service-runner.svg" />
    <img alt="GitHub release" src="https://img.shields.io/github/release/etclabscore/jade-service-runner.svg" />
    <img alt="GitHub commits since latest release" src="https://img.shields.io/github/commits-since/etclabscore/jade-service-runner/latest.svg" />
  </span>
</center>

Service Runner is an opinionated JSON-RPC service manager, that provides daemonization, installation, and discovery for JSON-RPC based services.

Service Runner helps developers gain access to a user's locally run services. It provides users with a management and installation tool, that allows developers to discover  services and reliably request access to those services.

## Better dApp Development
Service Runner improves the dApp development cycle, by reducing the number of steps required for running services that are local to the user, in addition to  associated with relying on locally running JSON-RPC services. To do this effectively, Jade Service Runner supports the following:
  - Allows dApp developers to specify what services they'd like to use
  - Provides defaults for the services to run
  - Provides users with an easy installation path
  - Provides reliable discovery of pre-existing services run by the service runner
  - Provides OpenRPC interface to the Service Runnner functionality, as well as the underlying services
  - Allows dApp developers the ability to retrieve reliable JSON-RPC connection information from the service
  - Provides typed interfaces to develop applications against

## Getting Started
---------------

Install `jade-service-runner` using npm

```shell
npm install -g @etclabscore/jade-service-runner
```

It also has a javascript client:
```
npm install @etclabscore/jade-service-runner-client
```

Then require it into any module.

```js
const { ServiceRunner } = require('@etclabscore/jade-service-runner-client');
const ERPC = require('@etclabscore/ethereum-json-rpc');
const serviceRunner = new ServiceRunner({ transport: { type: "http", port: 8002, host: "localhost" } });
const serviceName = 'multi-geth';
const successful = await serviceRunner.installService(serviceName);
if (successful === false) throw new Error('Service not installed')
const serviceConfig = serviceRunner.start(serviceName, 'kotti');
const erpc = new ERPC(serviceConfig);
erpc.getBalance("0x0DEADBEEF");
```

to run the service runner:

```shell
jade-service-runner
```

## Supported Services

Currently it supports `multi-geth` with the following environments:

- `mainnet (ETC)`
- `kotti`
- `ethereum`
- `goerli`
- `rinkeby`

## Extending services
You can extend jade-service-runner with your own configuration via the command line interface

```
jade-service-runner -c extended-jade-service-runner-config.json
```

## JSON-RPC API Documentation

You can view the API documentation [here](https://playground.open-rpc.org/?uiSchema[appBar][ui:title]=Jade%20Service%20Runner&uiSchema[appBar][ui:logoUrl]=https://github.com/etclabscore/jade-media-assets/raw/master/jade-logo-light/jade-logo-light%20(PNG)/48x48.png&uiSchema[appBar][ui:splitView]=false&uiSchema[appBar][ui:input]=false&uiSchema[methods][ui:title]=&schemaUrl=https://raw.githubusercontent.com/etclabscore/jade-service-runner/master/openrpc.json).


# Contributing

How to contribute, build and release are outlined in [CONTRIBUTING.md](CONTRIBUTING.md), [BUILDING.md](BUILDING.md) and [RELEASING.md](RELEASING.md) respectively. Commits in this repository follow the [CONVENTIONAL_COMMITS.md](CONVENTIONAL_COMMITS.md) specification.

# Resources
- [jade.builders](https://jade.builders/)
- [etclabscore/jade](https://github.com/etclabscore/jade)
