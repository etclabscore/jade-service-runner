#!/bin/bash

set +e

aws cloudformation create-stack \
    --stack-name jade-service-runner-base-stack \
    --template-body file://cfn/eb-application.cfn.json \
    --parameters file://cfn/base-launch-params.json \
    --capabilities CAPABILITY_IAM \
    --disable-rollback \
    --region us-west-2

aws cloudformation wait stack-create-complete \
    --stack-name jade-service-runner-base--stack \
    --region us-west-2
