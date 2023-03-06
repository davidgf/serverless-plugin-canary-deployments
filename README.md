[![npm version](https://badge.fury.io/js/serverless-plugin-canary-deployments.svg)](https://badge.fury.io/js/serverless-plugin-canary-deployments)

# Serverless Plugin Canary Deployments

A Serverless plugin to implement canary deployments of Lambda functions, making use of the [traffic shifting feature](https://docs.aws.amazon.com/lambda/latest/dg/lambda-traffic-shifting-using-aliases.html) in combination with [AWS CodeDeploy](https://docs.aws.amazon.com/lambda/latest/dg/automating-updates-to-serverless-apps.html)

## Contents

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [How it works](#how)
- [Limitations](#limitations)
- [License](#license)

## <a name="installation"></a>Installation

`npm i --save-dev serverless-plugin-canary-deployments`

## <a name="usage"></a>Usage

To enable gradual deployments for Lambda functions, your `serverless.yml` should look like this:

```yaml
service: canary-deployments
provider:
  name: aws
  runtime: nodejs6.10
  iamRoleStatements:
    - Effect: Allow
      Action:
        - codedeploy:*
      Resource:
        - "*"

plugins:
  - serverless-plugin-canary-deployments

functions:
  hello:
    handler: handler.hello
    events:
      - http: GET hello
    deploymentSettings:
      type: Linear10PercentEvery1Minute
      alias: Live
      preTrafficHook: preHook
      postTrafficHook: postHook
      alarms:
        - FooAlarm          # When a string is provided, it expects the alarm Logical ID
        - name: BarAlarm    # When an object is provided, it expects the alarm name in the name property

  preHook:
    handler: hooks.pre
  postHook:
    handler: hooks.post
```

You can see a working example in the [example folder](./example/).

## <a name="configuration"></a>Configuration

* `type`: (required) defines how the traffic will be shifted between Lambda function versions. It must be one of the following:
  - `Canary10Percent5Minutes`: shifts 10 percent of traffic in the first increment. The remaining 90 percent is deployed five minutes later.
  - `Canary10Percent10Minutes`: shifts 10 percent of traffic in the first increment. The remaining 90 percent is deployed 10 minutes later.
  - `Canary10Percent15Minutes`: shifts 10 percent of traffic in the first increment. The remaining 90 percent is deployed 15 minutes later.
  - `Canary10Percent30Minutes`: shifts 10 percent of traffic in the first increment. The remaining 90 percent is deployed 30 minutes later.
  - `Linear10PercentEvery1Minute`: shifts 10 percent of traffic every minute until all traffic is shifted.
  - `Linear10PercentEvery2Minutes`: shifts 10 percent of traffic every two minutes until all traffic is shifted.
  - `Linear10PercentEvery3Minutes`: shifts 10 percent of traffic every three minutes until all traffic is shifted.
  - `Linear10PercentEvery10Minutes`: shifts 10 percent of traffic every 10 minutes until all traffic is shifted.
  - `AllAtOnce`: shifts all the traffic to the new version, useful when you only need to execute the validation hooks.
* `alias`: (required) name that will be used to create the Lambda function alias.
* `preTrafficHook`: (optional) validation Lambda function that runs before traffic shifting. It must use the CodeDeploy SDK to notify about this step's success or failure (more info [here](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html)).
* `postTrafficHook`: (optional) validation Lambda function that runs after traffic shifting. It must use the CodeDeploy SDK to notify about this step's success or failure (more info [here](https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html))
* `alarms`: (optional) list of CloudWatch alarms. If any of them is triggered during the deployment, the associated Lambda function will automatically roll back to the previous version.
* `triggerConfigurations`: (optional) list of CodeDeploy Triggers. See more details in the [CodeDeploy TriggerConfiguration Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codedeploy-deploymentgroup-triggerconfig.html), or [this CodeDeploy notifications guide](https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-sns-event-notifications-create-trigger.html) for example uses

### Default configurations

You can set default values for all functions in a top-level custom deploymentSettings section.  E.g.:

```yaml
custom:
  deploymentSettings:
    codeDeployRole: some_arn_value
    codeDeployRolePermissionsBoundary: some_arn_value
    stages:
      - dev
      - prod

functions:
  ...
```

Some values are only available as top-level configurations.  They are:

* `codeDeployRole`: (optional) an ARN specifying an existing IAM role for CodeDeploy.  If absent, one will be created for you.  See the [codeDeploy policy](./example-code-deploy-policy.json) for an example of what is needed.
* `codeDeployRolePermissionsBoundary`: (optional) an ARN specifying an existing IAM permissions boundary, this permission boundary is set on the code deploy that is being created when codeDeployRole is not defined.
* `stages`: (optional) list of stages where you want to deploy your functions gradually. If not present, it assumes that are all of them.

## <a name="how"></a>How it works

The plugin relies on the [AWS Lambda traffic shifting feature](https://docs.aws.amazon.com/lambda/latest/dg/lambda-traffic-shifting-using-aliases.html) to balance traffic between versions and [AWS CodeDeploy](https://docs.aws.amazon.com/lambda/latest/dg/automating-updates-to-serverless-apps.html) to automatically update its weight. It modifies the `CloudFormation` template generated by [Serverless](https://github.com/serverless/serverless), so that:

1. It creates a Lambda function Alias for each function with deployment settings.
2. It creates a CodeDeploy Application and adds a [CodeDeploy DeploymentGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-codedeploy-deploymentgroup.html) per Lambda function, according to the specified settings.
3. It modifies events that trigger Lambda functions, so that they invoke the newly created alias.

## <a name="limitations"></a>Limitations

For now, the plugin only works with Lambda functions invoked by

* API Gateway
* Stream based (such as the triggered by Kinesis, DynamoDB Streams or SQS)
* SNS based events
* S3 events
* CloudWatch Scheduled events
* CloudWatch Logs
* IoT rules
* AppSync DataSources

[More events](https://serverless.com/framework/docs/providers/aws/events/) will be added soon.

## <a name="license"></a>License

ISC © [David García](https://github.com/davidgf)
