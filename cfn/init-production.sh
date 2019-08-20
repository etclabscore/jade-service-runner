#!/bin/bash

aws cloudformation create-stack \
    --stack-name jade-service-runner-production-beanstalk-stack \
    --template-body file://cfn/jade-service-runner.cfn.json \
    --parameters file://cfn/production-launch-params.json \
    --capabilities CAPABILITY_IAM \
    --disable-rollback \
    --region us-west-2 || true

aws cloudformation wait stack-create-complete \
    --stack-name jade-service-runner-production-beanstalk-stack \
    --region us-west-2 || true
