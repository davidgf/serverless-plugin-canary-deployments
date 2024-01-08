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

function buildAlias ({ alias, functionName, functionVersion, trafficShiftingSettings, targetAliasTemplate }) {
  const lambdaAlias = {
    ...targetAliasTemplate,
    Type: 'AWS::Lambda::Alias',
    Properties: {
      ...(targetAliasTemplate ? targetAliasTemplate.Properties : null),
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

function replacePermissionFunctionWithAlias (lambdaPermission, functionAliasLogicalId) {
  const newPermission = _.set('Properties.FunctionName', { Ref: functionAliasLogicalId }, lambdaPermission)
  return newPermission
}

function replaceEventMappingFunctionWithAlias (eventSourceMapping, functionAliasLogicalId) {
  const newMapping = _.set('Properties.FunctionName', { Ref: functionAliasLogicalId }, eventSourceMapping)
  return newMapping
}

const Lambda = {
  buildAlias,
  replacePermissionFunctionWithAlias,
  replaceEventMappingFunctionWithAlias
}

module.exports = Lambda
