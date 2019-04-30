![](https://www.etclabs.org/dist/resources/images/v2/logo-top.png)
Supported by [ETC Labs](https://www.etclabs.org/)


# An JSON-RPC process manager for OpenRPC supported projects

## Problem Statement
Developers need a reliable way to access JSON-RPC based services that run locally on an individual user machines. It is difficult for users to provide 
a consistent and informative interface to access these services. Jade Service Runner is an OpenRPC based service, that clients can install to install, run, and manage their OpenRPC based projects. 

## Better Dapp Development
The goal of this project is improve the dApp development cycle associated with relying on locally running JSON-RPC services. To do this effectively, Jade Service Runner supports the following:
  - Allows dApp developers to specify what services they'd like to use
  - Provides defaults for the services to run  
  - Provides reliable discovery of pre-existing services run by the service runner 
  - Provides OpenRPC interface to the Service Runnner functionality, as well as the underlying services
  - Allows dApp developers the ability to retrieve reliable JSON-RPC connection information from the service
  - Provide typed interfaces to develop applications against
  - Provides easy user installation.

## Getting Started
---------------

Install `jade-service-runner` using npm

```shell
npm install jade-service-runner 
```
Then require it into any module.
 
<!-- runkit:activate -->
```js
const { ServiceRunner } = require('immutable');
const { MultiGeth } = require('@multi-geth/types');
const serviceRunner = new ServiceRunner('localhost','8585');
const serviceName='multi-geth';
const successful = await serviceRunner.installService(serviceName);
if(successful === false) throw new Error('Service not installed')
const serviceConfig = serviceRunner.start(serviceName, 'gorli');
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
# Introduction

# Definitions

# Contributing