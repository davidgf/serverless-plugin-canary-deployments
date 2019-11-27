const { expect } = require('chai')
const _ = require('lodash/fp')
const ApiGateway = require('./ApiGateway')

describe('ApiGateway', () => {
  const apiGatewayMethod = {
    Type: 'AWS::ApiGateway::Method',
    Properties: {
      HttpMethod: 'GET',
      ResourceId: { Ref: 'ApiGatewayResourceId' },
      RestApiId: { Ref: 'ApiGatewayRestApi' },
      Integration: {
        IntegrationHttpMethod: 'POST',
        Type: 'AWS_PROXY',
        Uri: {
          'Fn::Join': [
            '',
            [
              'arn:aws:apigateway:',
              { Ref: 'AWS::Region' },
              ':lambda:path/2015-03-31/functions/',
              { 'Fn:GetAtt': ['HelloLambdaFunction', 'Arn'] },
              '/invocations'
            ]
          ]
        }
      },
      MethodResponses: []
    }
  }

  const apiGatewayV2Method = {
    Type: 'AWS::ApiGatewayV2::Integration',
    Properties: {
      IntegrationType: 'AWS_PROXY',
      ApiId: { Ref: 'ApiGatewayResourceId' },
      IntegrationUri: {
        'Fn::Join': [
          '',
          [
            'arn:',
            { Ref: 'AWS::Partition' },
            ':apigateway:',
            { Ref: 'AWS::Region' },
            ':lambda:path/2015-03-31/functions/',
            { 'Fn:GetAtt': ['HelloLambdaFunction', 'Arn'] },
            '/invocations'
          ]
        ]
      },
      MethodResponses: []
    }
  }

  describe('.replaceMethodUriWithAlias', () => {
    it('replaces the method URI with a function alias ARN', () => {
      const functionAlias = 'TheFunctionAlias'
      const uriWithAwsVariables = [
        'arn:aws:apigateway:',
        { Ref: 'AWS::Region' },
        ':lambda:path/2015-03-31/functions/',
        { Ref: functionAlias },
        '/invocations'
      ]
      const uri = { 'Fn::Join': ['', uriWithAwsVariables] }
      const expected = _.set('Properties.Integration.Uri', uri, apiGatewayMethod)
      const actual = ApiGateway.replaceMethodUriWithAlias(apiGatewayMethod, functionAlias)
      expect(actual).to.deep.equal(expected)
    })
  })

  describe('.replaceV2IntegrationUriWithAlias', () => {
    it('replaces the integration URI with a function alias ARN', () => {
      const functionAlias = 'TheFunctionAlias'
      const uriWithAwsVariables = [
        'arn:',
        { Ref: 'AWS::Partition' },
        ':apigateway:',
        { Ref: 'AWS::Region' },
        ':lambda:path/2015-03-31/functions/',
        { Ref: functionAlias },
        '/invocations'
      ]
      const uri = { 'Fn::Join': ['', uriWithAwsVariables] }
      const expected = _.set('Properties.IntegrationUri', uri, apiGatewayV2Method)
      const actual = ApiGateway.replaceV2IntegrationUriWithAlias(apiGatewayV2Method, functionAlias)
      expect(actual).to.deep.equal(expected)
    })
  })
})
