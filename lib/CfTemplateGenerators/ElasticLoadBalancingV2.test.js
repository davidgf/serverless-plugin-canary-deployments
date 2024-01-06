const { expect } = require('chai')
const ElasticLoadBalancingV2 = require('./ElasticLoadBalancingV2')

describe('ElasticLoadBalancingV2', () => {
  describe('.replaceElbV2TargetGroupWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    const targetGroup = {
      Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
      Name: 'bf43cde54e2ea1a9465b1890061423d3',
      Properties: {
        TargetType: 'lambda',
        Targets: [
          {
            Id: {
              'Fn::GetAtt': [
                functionName,
                'Arn'
              ]
            }
          },
          {
            Id: {
              'Fn::Join': [
                ':',
                [
                  {
                    'Fn::GetAtt': [
                      functionName,
                      'Arn'
                    ]
                  },
                  'provisioned'
                ]
              ]
            }
          },
          {
            Id: { Ref: 'UnrelatedTargetRef' }
          }
        ]
      }
    }

    it('replaces correct targets with the alias', () => {
      const functionAlias = 'TheFunctionAlias'
      const expected = {
        Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
        Name: 'bf43cde54e2ea1a9465b1890061423d3',
        Properties: {
          TargetType: 'lambda',
          Targets: [
            {
              Id: { Ref: functionAlias }
            },
            {
              Id: { Ref: functionAlias }
            },
            {
              Id: { Ref: 'UnrelatedTargetRef' }
            }
          ]
        }
      }
      const actual = ElasticLoadBalancingV2.replaceElbV2TargetGroupWithAlias(targetGroup, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })
})
