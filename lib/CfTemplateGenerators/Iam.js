function buildCodeDeployRole () {
  return {
    Type: 'AWS::IAM::Role',
    Properties: {
      ManagedPolicyArns: [
        'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambda',
        'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
      ],
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
}

const Iam = {
  buildCodeDeployRole
}

module.exports = Iam
