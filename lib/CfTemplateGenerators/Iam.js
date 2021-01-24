const _ = require('lodash/fp')

function buildCodeDeployRole (codeDeployRolePermissionsBoundaryArn, areTriggerConfigurationsSet) {
  const attachedPolicies = [
    'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
    'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
  ]
  if (areTriggerConfigurationsSet) {
    attachedPolicies.push('arn:aws:iam::aws:policy/AmazonSNSFullAccess')
  }
  const iamRoleCodeDeploy = {
    Type: 'AWS::IAM::Role',
    Properties: {
      ManagedPolicyArns: attachedPolicies,
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['sts:AssumeRole'],
            Effect: 'Allow',
            Principal: { Service: ['codedeploy.amazonaws.com'] }
          }
        ]
      }
    }
  }
  if (codeDeployRolePermissionsBoundaryArn) {
    Object.assign(iamRoleCodeDeploy.Properties, { PermissionsBoundary: codeDeployRolePermissionsBoundaryArn })
  }
  return iamRoleCodeDeploy
}

function patchExecutionRoleForCodeDeploy (executionRole, codeDeployAppName, deploymentGroups) {
  if (deploymentGroups.length === 0) {
    return
  }
  const statement = _.prop(`Properties.Policies.0.PolicyDocument.Statement`, executionRole)
  if (!statement) {
    return
  }
  statement.push({
    Action: ['codedeploy:PutLifecycleEventHookExecutionStatus'],
    Effect: 'Allow',
    Resource: deploymentGroups.map(deploymentGroup => ({
      'Fn::Sub': `arn:\${AWS::Partition}:codedeploy:\${AWS::Region}:\${AWS::AccountId}:deploymentgroup:\${${codeDeployAppName}}/\${${deploymentGroup}}`
    }))
  })
}

const Iam = {
  buildCodeDeployRole,
  patchExecutionRoleForCodeDeploy
}

module.exports = Iam
