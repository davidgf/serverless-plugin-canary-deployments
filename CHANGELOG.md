# 0.8.0 (11.04.2022)
- Add support for AppSync #144

# 0.7.1 (14.11.2021)
- Truncate deployment group name to 100 characters #139
- Add lambda permission to support function name ref #141

# 0.7.0 (09.09.2021)
- Generate a Deployment Group Name in the format of ${stackName}-${logicalId} to avoid a circular dependency when used with the aws-alerts plugin #135

# 0.6.0 (31.03.2021)
- Add config validator #102
- Replace deprecated AWS managed policy for codedeploy #116

# 0.5.0 (09.02.2021)
- Add support for API Gateway v2 #72
- Update CodeDeploy default policy to AWSCodeDeployRoleForLambdaLimited #98
- Add support for IAM permissions boundaries #99
- Patch in CodeDeploy permissions for hooks #110

# 0.4.8 (28.07.2019)
- Add support for IoT rules

# 0.4.7 (01.04.2019)
- Add support for CloudWatch Logs events
- Add support for SNS Subscriptions with filter policies

# 0.4.6 (14.02.2019)
- Add support for CloudWatch Events

# 0.4.5 (14.01.2019)
- Allow configuring CodeDeploy triggers

# 0.4.4 (12.12.2018)
- Add compatibility with `serverless-plugin-split-stacks`

# 0.4.3 (21.10.2018)
- Allow referencing alarms by their name

# 0.4.2 (18.04.2018)
- Add configuration for enabling canary deployments on a per stage basis

# 0.4.1 (16.04.2018)
- Add configurable Role for CodeDeploy

# 0.4.0 (09.04.2018)
- Add support for S3 events
- Fix bug that prevented `custom` section in `serverless.yml` to be empty

# 0.3.1 (20.03.2018)
- Fix bug that prevented setting deployment preferences without hooks

# 0.3.0 (13.03.2018)
- Support for SNS events

# 0.2.0 (08.03.2018)
- Support for Stream based events (Kinesis and DynamoDB Streams)
- Add end-to-end tests

# 0.1.0 (24.02.2018)
- Add alias for Lambda functions with deployment settings
- Replace reference to Lambda function `$Latest` version for alias in API Gateway Methods
- Add CodeDeploy support for Lambda gradual deployments
- Add support for traffic shifting hooks
- Add support for CodeDeploy alarms
- Add usage example
