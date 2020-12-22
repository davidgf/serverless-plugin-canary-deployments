function buildCodeDeployRole (areTriggerConfigurationsSet) {
  var managedPolicyArns = [
    'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
    'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
  ]
  if (areTriggerConfigurationsSet) {
    managedPolicyArns.push('arn:aws:iam::aws:policy/AmazonSNSFullAccess')
  }
  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      ManagedPolicyArns: managedPolicyArns,
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
