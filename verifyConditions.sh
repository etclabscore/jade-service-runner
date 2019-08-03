#!/bin/bash

error=false
if [[ -z $NPM_TOKEN ]]; then
    echo "ERROR: No NPM_TOKEN specified."
    error=true;
fi

if [[ -z $GH_TOKEN ]]; then
    echo "ERROR: No GH_TOKEN specified."
    error=true
fi

if [[ -z $CARGO_TOKEN ]]; then
    echo "ERROR: No CARGO_TOKEN specified."
    error=true
fi


if [[ "$error" = true ]]; then
  exit 1
fi