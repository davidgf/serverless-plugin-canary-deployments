const _ = require('lodash/fp')
const omitEmpty = require('omit-empty')

function buildUpdatePolicy ({
  codeDeployApp,
  deploymentGroup,
  afterHook,
  beforeHook
}) {
  const updatePolicy = {
    CodeDeployLambdaAliasUpdate: {
      ApplicationName: { Ref: codeDeployApp },
      AfterAllowTrafficHook: { Ref: afterHook },
      BeforeAllowTrafficHook: { Ref: beforeHook },
      DeploymentGroupName: { Ref: deploymentGroup }
    }
  }
  return omitEmpty({ UpdatePolicy: updatePolicy })
}

function buildAlias ({
  alias,
  functionName,
  functionVersion,
  trafficShiftingSettings,
  provisionedConcurrency
}) {
  const provisionedConcurrencyValue = buildProvisionedConcurrency(
    provisionedConcurrency
  )
  const lambdaAlias = {
    Type: 'AWS::Lambda::Alias',
    Properties: {
      FunctionVersion: { 'Fn::GetAtt': [functionVersion, 'Version'] },
      FunctionName: { Ref: functionName },
      Name: alias,
      ...provisionedConcurrencyValue
    }
  }
  if (trafficShiftingSettings) {
    const updatePolicy = buildUpdatePolicy(trafficShiftingSettings)
    Object.assign(lambdaAlias, updatePolicy)
  }

  return lambdaAlias
}

function replacePermissionFunctionWithAlias (lambdaPermission, functionAlias) {
  const newPermission = _.set(
    'Properties.FunctionName',
    { Ref: functionAlias },
    lambdaPermission
  )
  return newPermission
}

function removeProvisionAlias (lambdaPermission) {
  return _.omit('DependsOn', lambdaPermission)
}

function replaceEventMappingFunctionWithAlias (
  eventSourceMapping,
  functionAlias
) {
  const newMapping = _.set(
    'Properties.FunctionName',
    { Ref: functionAlias },
    eventSourceMapping
  )
  return newMapping
}

function buildProvisionedConcurrency (count) {
  if (!count) {
    return {}
  }
  return {
    ProvisionedConcurrencyConfig: {
      ProvisionedConcurrentExecutions: count
    }
  }
}

const Lambda = {
  buildAlias,
  replacePermissionFunctionWithAlias,
  replaceEventMappingFunctionWithAlias,
  removeProvisionAlias
}

module.exports = Lambda
