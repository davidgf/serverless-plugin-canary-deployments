const { expect } = require('chai')
const Sns = require('./Sns')

describe('Sns', () => {
  describe('.replaceTopicSubscriptionFunctionWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    const snsTopic = {
      Type: 'AWS::SNS::Topic',
      Properties: {
        TopicName: 'snsTopic',
        DisplayName: '',
        Subscription: [
          {
            Endpoint: {
              'Fn::GetAtt': [functionName, 'Arn']
            },
            Protocol: 'lambda'
          },
          {
            Endpoint: {
              'Fn::GetAtt': ['func', 'Arn']
            },
            Protocol: 'lambda'
          }
        ]
      }
    }

    it("replaces the topic subscription's function for an alias", () => {
      const functionAlias = 'TheFunctionAlias'
      const expected = {
        Type: 'AWS::SNS::Topic',
        Properties: {
          TopicName: 'snsTopic',
          DisplayName: '',
          Subscription: [
            {
              Endpoint: {
                'Fn::GetAtt': ['func', 'Arn']
              },
              Protocol: 'lambda'
            },
            {
              Endpoint: { Ref: functionAlias },
              Protocol: 'lambda'
            }
          ]
        }
      }
      const actual = Sns.replaceTopicSubscriptionFunctionWithAlias(snsTopic, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })

  describe('.replaceSubscriptionFunctionWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    it("replace the sns subscription's function for an alias", () => {
      const snsSubscription = {
        Type: 'AWS::SNS::Subscription',
        Properties: {
          TopicArn: {
            Ref: 'snsTopic'
          },
          Protocol: 'lambda',
          Endpoint: {
            'Fn::GetAtt': [
              functionName,
              'Arn'
            ]
          },
          FilterPolicy: {
            eventType: [
              'snsFoo'
            ]
          }
        }
      }
      const functionAlias = 'TheFunctionAlias'
      const expected = {
        Type: 'AWS::SNS::Subscription',
        Properties: {
          TopicArn: {
            Ref: 'snsTopic'
          },
          Protocol: 'lambda',
          Endpoint: {
            Ref: functionAlias
          },
          FilterPolicy: {
            eventType: [
              'snsFoo'
            ]
          }
        }
      }
      const actual = Sns.replaceSubscriptionFunctionWithAlias(snsSubscription, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })
})
