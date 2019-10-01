# Jade Service Runner - A JSON-RPC Service Manager

<!-- project shields -->
  <span>
    <img alt="CircleCI branch" src="https://img.shields.io/circleci/project/github/etclabscore/jade-service-runner/master.svg">
    <img src="https://codecov.io/gh/etclabscore/jade-service-runner/branch/master/graph/badge.svg" />
    <img alt="Dependabot status" src="https://api.dependabot.com/badges/status?host=github&repo=etclabscore/jade-service-runner" />
    <a target="_blank" href="https://discord.gg/S9AT3X2"><img alt="Chat on Discord" src="https://img.shields.io/badge/chat-on%20discord-7289da.svg" /></a>
    <img alt="npm" src="https://img.shields.io/npm/dt/@etclabscore/jade-service-runner.svg" />
    <img alt="GitHub release" src="https://img.shields.io/github/release/etclabscore/jade-service-runner.svg" />
    <img alt="GitHub commits since latest release" src="https://img.shields.io/github/commits-since/etclabscore/jade-service-runner/latest.svg" />
  </span>

<!-- project logo w/ quick links -->
<p align="center">
  <img height="256" width="256" src="https://raw.githubusercontent.com/etclabscore/jade-media-assets/master/jade-logo-light/jade-logo-light%20(PNG)/256x256.png" />
</p>
<center>
  <h3 align="center">Jade Service Runner</h3>

  <p align="center">
    An awesome JSON-RPC service manager!
    <br />
    <a href="https://www.youtube.com/watch?v=Y-Wdg1hgMls&t=2660s">View Demo</a>
    ·
    <a href="https://github.com/etclabscore/jade-service-runner/issues/new?assignees=&labels=&template=bug_report.md&title=">Report Bug</a>
    ·
    <a href="https://github.com/etclabscore/jade-service-runner/issues/new/choose">Request Feature</a>
  </p>
</center>

<!-- table of contents -->
## Table of Contents
  - [About The Project](#about-the-project)
    - [Better dApp Development](#better-dapp-development)
    - [Supported Services](#supported-services)
  - [Getting Started](#getting-started)
      - [Prerequisites](#prerequisites)
      - [Installation](#installation)
  - [Usage](#usage)
    - [JSON-RPC API Documentation](#json-rpc-api-documentation)
    - [Extending services](#extending-services)
- [Contributing](#contributing)
- [Resources](#resources)

<!-- about the project -->
## About The Project

Service Runner is an opinionated JSON-RPC service manager, that provides daemonization, installation, and discovery for JSON-RPC based services.

Service Runner helps developers gain access to a user's locally run services. It provides users with a management and installation tool, that allows developers to discover  services and reliably request access to those services.

### Better dApp Development

Service Runner improves the dApp development cycle, by reducing the number of steps required for running services that are local to the user, in addition to  associated with relying on locally running JSON-RPC services. To do this effectively, Jade Service Runner supports the following:

  - Allows dApp developers to specify what services they'd like to use
  - Provides defaults for the services to run
  - Provides users with an easy installation path
  - Provides reliable discovery of pre-existing services run by the service runner
  - Provides OpenRPC interface to the Service Runner functionality, as well as the underlying services
  - Allows dApp developers the ability to retrieve reliable JSON-RPC connection information from the service
  - Provides typed interfaces to develop applications against

### Supported Services

Currently it supports `multi-geth` with the following environments:

- `mainnet (ETC)`
- `kotti`
- `ethereum`
- `goerli`
- `rinkeby`

## Getting Started

### Prerequisites

- node v12.10.0 or greater.
- npm v6.10.3 or greater.

### Installation

Install via npm package

```bash
npm install -g @etclabscore/jade-service-runner
```

Install the JavaScript client:

```bash
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

To run the jade-service-runner:

```shell
jade-service-runner
```

## Usage

### JSON-RPC API Documentation

You can view the API documentation [here](https://playground.open-rpc.org/?uiSchema[appBar][ui:title]=Jade%20Service%20Runner&uiSchema[appBar][ui:logoUrl]=https://github.com/etclabscore/jade-media-assets/raw/master/jade-logo-light/jade-logo-light%20(PNG)/48x48.png&uiSchema[appBar][ui:splitView]=false&uiSchema[appBar][ui:input]=false&uiSchema[methods][ui:title]=&schemaUrl=https://raw.githubusercontent.com/etclabscore/jade-service-runner/master/openrpc.json).

### Extending services

You can extend jade-service-runner with your own configuration via the command line interface

```bash
jade-service-runner -c extended-jade-service-runner-config.json
```

## Roadmap

See the [open issues](https://github.com/etclabscore/jade-service-runner/issues) for a list of proposed features (and known issues).

## Contributing

How to contribute, build and release are outlined in [CONTRIBUTING.md](CONTRIBUTING.md), [BUILDING.md](BUILDING.md) and [RELEASING.md](RELEASING.md) respectively. Commits in this repository follow the [CONVENTIONAL_COMMITS.md](CONVENTIONAL_COMMITS.md) specification.

## License

Apache License 2.0

## Resources
- [Jade.Builders](https://jade.builders/)
- [Jade Specification](https://github.com/etclabscore/jade)  
