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

const Iam = {
  buildCodeDeployRole
}

module.exports = Iam
