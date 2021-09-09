const { expect } = require('chai')
const Iam = require('./Iam')

describe('Iam', () => {
  describe('.buildCodeDeployRole', () => {
    context('when trigger configurations are not set', () => {
      it('should generate a AWS::IAM::Role resource', () => {
        const expected = {
          Type: 'AWS::IAM::Role',
          Properties: {
            ManagedPolicyArns: [
              'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
              'arn:aws:iam::aws:policy/AWSLambda_FullAccess'
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
        const actual = Iam.buildCodeDeployRole(null, false)
        expect(actual).to.deep.equal(expected)
      })
    })
    context('when trigger configurations are set', () => {
      it('should generate a AWS::IAM::Role resource', () => {
        const expected = {
          Type: 'AWS::IAM::Role',
          Properties: {
            ManagedPolicyArns: [
              'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
              'arn:aws:iam::aws:policy/AWSLambda_FullAccess',
              'arn:aws:iam::aws:policy/AmazonSNSFullAccess'
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
        const actual = Iam.buildCodeDeployRole(null, true)
        expect(actual).to.deep.equal(expected)
      })
    })
  })
  describe('.buildCodeDeployRole with IAM permissions boundary', () => {
    it('should generate a AWS::IAM::Role resource with permissions boundary set', () => {
      const expected = {
        Type: 'AWS::IAM::Role',
        Properties: {
          ManagedPolicyArns: [
            'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
            'arn:aws:iam::aws:policy/AWSLambda_FullAccess'
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
          },
          PermissionsBoundary: 'arn:aws:iam::11111:policy/entity/boundary'
        }
      }
      const actual = Iam.buildCodeDeployRole('arn:aws:iam::11111:policy/entity/boundary')
      expect(actual).to.deep.equal(expected)
    })
  })
  describe('.buildExecutionRoleWithCodeDeploy', () => {
    const codeDeployAppName = 'ServiceDeploymentApplication'
    context('when role is well-formed', () => {
      it('should skip patching on zero deployment groups', () => {
        const input = {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyDocument: {
                  Statement: []
                }
              }
            ]
          }
        }
        const expected = JSON.parse(JSON.stringify(input))
        const deploymentGroups = []
        const actual = Iam.buildExecutionRoleWithCodeDeploy(input, codeDeployAppName, deploymentGroups)
        expect(actual).to.deep.equal(expected)
      })
      it('should patch in one deployment group', () => {
        const input = {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Action: ['s3:*'],
                      Effect: 'Deny',
                      Resource: ['*']
                    }
                  ]
                }
              }
            ]
          }
        }
        const expected = {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Action: ['s3:*'],
                      Effect: 'Deny',
                      Resource: ['*']
                    },
                    {
                      Action: ['codedeploy:PutLifecycleEventHookExecutionStatus'],
                      Effect: 'Allow',
                      Resource: [
                        // eslint-disable-next-line no-template-curly-in-string
                        { 'Fn::Sub': 'arn:${AWS::Partition}:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:${ServiceDeploymentApplication}/canary-deployments-test-dev-FirstLambdaFunctionDeploymentGroup' }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
        const deploymentGroups = ['canary-deployments-test-dev-FirstLambdaFunctionDeploymentGroup']
        const actual = Iam.buildExecutionRoleWithCodeDeploy(input, codeDeployAppName, deploymentGroups)
        expect(actual).to.deep.equal(expected)
        expect(actual).not.to.deep.equal(input)
      })
      it('should patch in multiple deployment groups', () => {
        const input = {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyDocument: {
                  Statement: []
                }
              }
            ]
          }
        }
        const expected = {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyDocument: {
                  Statement: [
                    {
                      Action: ['codedeploy:PutLifecycleEventHookExecutionStatus'],
                      Effect: 'Allow',
                      Resource: [
                        // eslint-disable-next-line no-template-curly-in-string
                        { 'Fn::Sub': 'arn:${AWS::Partition}:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:${ServiceDeploymentApplication}/canary-deployments-test-dev-FirstLambdaFunctionDeploymentGroup' },
                        // eslint-disable-next-line no-template-curly-in-string
                        { 'Fn::Sub': 'arn:${AWS::Partition}:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:${ServiceDeploymentApplication}/canary-deployments-test-dev-SecondLambdaFunctionDeploymentGroup' }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        }
        const deploymentGroups = ['canary-deployments-test-dev-FirstLambdaFunctionDeploymentGroup', 'canary-deployments-test-dev-SecondLambdaFunctionDeploymentGroup']
        const actual = Iam.buildExecutionRoleWithCodeDeploy(input, codeDeployAppName, deploymentGroups)
        expect(actual).to.deep.equal(expected)
        expect(actual).not.to.deep.equal(input)
      })
    })
    context('when role is unexpected', () => {
      it('should skip patching', () => {
        const input = {
          Type: 'AWS::IAM::Role',
          Properties: {
            ManagedPolicyArns: [
              'arn:aws:iam::aws:policy/service-role/AWSCodeDeployRoleForLambdaLimited',
              'arn:aws:iam::aws:policy/AWSLambda_FullAccess'
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
        const expected = JSON.parse(JSON.stringify(input))
        const deploymentGroups = ['canary-deployments-test-dev-FirstLambdaFunctionDeploymentGroup']
        const actual = Iam.buildExecutionRoleWithCodeDeploy(input, codeDeployAppName, deploymentGroups)
        expect(actual).to.deep.equal(expected)
      })
    })
  })
})
