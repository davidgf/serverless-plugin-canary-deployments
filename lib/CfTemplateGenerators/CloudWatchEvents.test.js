const { expect } = require('chai')
const CloudWatchEvents = require('./CloudWatchEvents')

describe('CloudWatchEvents', () => {
  describe('.replaceCloudWatchEventRuleTargetWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    const cloudWatchEvent = {
      Type: 'AWS::Events::Rule',
      Properties: {
        Description: 'test event rule',
        Name: 'Event Rule',
        Targets: [
          {
            Arn: {
              'Fn::GetAtt': [functionName, 'Arn']
            },
            Id: 'randomFunctionId001'
          },
          {
            Arn: {
              'Fn::GetAtt': ['func', 'Arn']
            },
            Id: 'randomFunctionId002'
          }
        ]
      }
    }

    it("replaces the event rule target's function for an alias", () => {
      const functionAlias = 'FunctionWithAlias'
      const expected = {
        Type: 'AWS::Events::Rule',
        Properties: {
          Name: 'Event Rule',
          Description: 'test event rule',
          Targets: [
            {
              Arn: { Ref: functionAlias },
              Id: 'randomFunctionId001'
            },
            {
              Arn: {
                'Fn::GetAtt': ['func', 'Arn']
              },
              Id: 'randomFunctionId002'
            }
          ]
        }
      }
      const actual = CloudWatchEvents.replaceCloudWatchEventRuleTargetWithAlias(cloudWatchEvent, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })
})
