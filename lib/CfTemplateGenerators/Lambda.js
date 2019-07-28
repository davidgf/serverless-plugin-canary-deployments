const _ = require('lodash/fp')
const omitEmpty = require('omit-empty')

function buildUpdatePolicy ({ codeDeployApp, deploymentGroup, afterHook, beforeHook }) {
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

function buildAlias ({ alias, functionName, functionVersion, trafficShiftingSettings }) {
  const lambdaAlias = {
    Type: 'AWS::Lambda::Alias',
    Properties: {
      FunctionVersion: { 'Fn::GetAtt': [functionVersion, 'Version'] },
      FunctionName: { Ref: functionName },
      Name: alias
    }
  }
  if (trafficShiftingSettings) {
    const updatePolicy = buildUpdatePolicy(trafficShiftingSettings)
    Object.assign(lambdaAlias, updatePolicy)
  }
  return lambdaAlias
}

function replacePermissionFunctionWithAlias (lambdaPermission, funcitonAlias) {
  const newPermission = _.set('Properties.FunctionName', { Ref: funcitonAlias }, lambdaPermission)
  return newPermission
}

function replaceEventMappingFunctionWithAlias (eventSourceMapping, funcitonAlias) {
  const newMapping = _.set('Properties.FunctionName', { Ref: funcitonAlias }, eventSourceMapping)
  return newMapping
}

const Lambda = {
  buildAlias,
  replacePermissionFunctionWithAlias,
  replaceEventMappingFunctionWithAlias
}

module.exports = Lambda
