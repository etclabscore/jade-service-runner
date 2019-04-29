![](https://www.etclabs.org/dist/resources/images/v2/logo-top.png)
Supported by [ETC Labs](https://www.etclabs.org/)


# A utility for running OpenRPC supported services

## Problem Statement
Running and accessing JSON-RPC services is currently difficult. JSON-RPC services are a defacto standard for communicating with decentralized services. Developers need to perform one or more of the following tasks
to ensure their dApps has access to the services it needs to run.
 - embed the service directly in the App
  - approach can potentially suffer from bloat, if the service takes alot of resources to run
 - use a remote centralized node (CryptoKitties) 
  - this route leads to some centralization in, the sense that traffic has to flow through a centralized point
 - rely on the user to have the service configured and running ambiently
  - this approach is the most difficult for, the end user, as it requires setup from the end user's perspective
   - the setup maybe highly involved setting ports, avoiding conflicts, passing arguments, managing multiple instances of a service that's running.

## Goal
The goal of this project is improve the dApp development cycle by solving the problems associated with running services that support JSON-RPC locally. To do this effectively, Jade Service Runner does the following:
  - Allows dApp developers to specify what services they'd like to use
  - Provides configurable defaults for the services to run  
  - Provides reliable discovery of pre-existing running services
  - Provides OpenRPC interface to the Service Runnner functionality
  - Provides tools to allow users to make decisions about what will run
  - Allows dApp developers the ability to rely on specific configurations of services being run when necessary
  - Provides users with an opt out feature
  - Easily bundled with a dapp or installed separately 

## Getting Started

# Introduction

# Definitions

# Contributing
