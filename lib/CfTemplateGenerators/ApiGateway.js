const _ = require('lodash/fp')

function buildUriForAlias (functionAlias) {
  const aliasArn = [
    'arn:aws:apigateway:',
    { Ref: 'AWS::Region' },
    ':lambda:path/2015-03-31/functions/',
    { Ref: functionAlias },
    '/invocations'
  ]
  return { 'Fn::Join': ['', aliasArn] }
}

function replaceMethodUriWithAlias (apiGatewayMethod, functionAlias) {
  const aliasUri = buildUriForAlias(functionAlias)
  const newMethod = _.set('Properties.Integration.Uri', aliasUri, apiGatewayMethod)
  return newMethod
}

const ApiGateway = {
  replaceMethodUriWithAlias
}

module.exports = ApiGateway
