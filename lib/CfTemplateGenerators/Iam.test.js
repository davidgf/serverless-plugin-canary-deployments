const { expect } = require('chai')
const Iam = require('./Iam')

describe('Iam', () => {
  describe('.buildCodeDeployRole', () => {
    it('should generate a CodeDeploy::Application resouce', () => {
      const expected = {
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
      const actual = Iam.buildCodeDeployRole()
      expect(actual).to.deep.equal(expected)
    })
  })
})
