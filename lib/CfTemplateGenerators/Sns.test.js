const { expect } = require('chai');
const Sns = require('./Sns');

describe('Sns', () => {
  describe('.replaceTopicSubscriptionFunctionWithAlias', () => {
    const functionName = 'HelloLambdaFunction';
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
    };

    it("replaces the topic subscription's function for an alias", () => {
      const functionAlias = 'TheFunctionAlias';
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
      };
      const actual = Sns.replaceTopicSubscriptionFunctionWithAlias(snsTopic, functionAlias, functionName);
      expect(actual).to.deep.equal(expected);
    });
  });
});
