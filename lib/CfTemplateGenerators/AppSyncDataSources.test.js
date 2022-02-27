const { expect } = require('chai')
const AppSyncDataSources = require('./AppSyncDataSources')

describe('AppSyncDataSources', () => {
  describe('.replaceAppSyncDataSourceWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    const appSyncDataSource = {
      Type: 'AWS::AppSync::DataSource',
      Properties: {
        ApiId: {
          'Fn::GetAtt': [
            'TestGraphQlApi',
            'ApiId'
          ]
        },
        Description: 'test event rule',
        Name: 'Event Rule',
        Type: 'AWS_LAMBDA',
        ServiceRoleArn: {
          'Fn::GetAtt': [
            'TestGraphQlApiRole',
            'Arn'
          ]
        },
        LambdaConfig: {
          LambdaFunctionArn: {
            'Fn::GetAtt': [
              functionName,
              'Arn'
            ]
          }
        }
      }
    }

    it('replaces the appSync DataSource function for an alias', () => {
      const functionAlias = 'FunctionWithAlias'
      const expected = {
        Type: 'AWS::AppSync::DataSource',
        Properties: {
          ApiId: {
            'Fn::GetAtt': [
              'TestGraphQlApi',
              'ApiId'
            ]
          },
          Description: 'test event rule',
          Name: 'Event Rule',
          Type: 'AWS_LAMBDA',
          ServiceRoleArn: {
            'Fn::GetAtt': [
              'TestGraphQlApiRole',
              'Arn'
            ]
          },
          LambdaConfig: {
            LambdaFunctionArn: { Ref: functionAlias }
          }
        }
      }

      const actual = AppSyncDataSources.replaceAppSyncDataSourceWithAlias(appSyncDataSource, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })
})
