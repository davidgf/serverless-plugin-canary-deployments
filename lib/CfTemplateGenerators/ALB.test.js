const { expect } = require('chai')
const _ = require('lodash/fp')
const ALB = require('./ALB')

describe('ALB', () => {
  const ALBMethod = {
    Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
    Properties: {
      Name: '1234567890',
      TargetType: 'lambda',
      Targets: [
        {
          Id: {
            'Fn::GetAtt': ['FirstLambdaFunction', 'Arn']
          }
        }
      ]
    },
    DependsOn: ['FirstLambdaPermissionRegisterTarget']
  }

  describe('.replaceTargetGroupWithAlias', () => {
    it('replaces the target group Lambda Ref with the function Alias Ref', () => {
      const functionAlias = 'TheFunctionAlias'
      const blah = {
        Ref: 'TheFunctionAlias'
      }
      const expected = _.set('Properties.Targets[0].Id', blah, ALBMethod)
      const actual = ALB.replaceTargetGroupWithAlias(ALBMethod, functionAlias)
      expect(actual).to.deep.equal(expected)
    })
  })
})
