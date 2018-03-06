const _ = require('lodash/fp');

function buildUriForAlias(functionAlias) {
  const aliasArn = [
    'arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${',
    functionAlias,
    '}/invocations'
  ].join('');
  return { 'Fn::Sub': aliasArn };
}

function replaceMethodUriWithAlias(apiGatewayMethod, functionAlias) {
  const aliasUri = buildUriForAlias(functionAlias);
  const newMethod = _.set('Properties.Integration.Uri', aliasUri, apiGatewayMethod);
  return newMethod;
}

const ApiGateway = {
  replaceMethodUriWithAlias
};

module.exports = ApiGateway;
