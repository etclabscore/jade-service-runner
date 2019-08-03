#!/bin/bash

npm run build
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/jade-service-runner/build/generated-client/typescript/.npmrc
cd build/generated-client/typescript && npm publish --access=public
