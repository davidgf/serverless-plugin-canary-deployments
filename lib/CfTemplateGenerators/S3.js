const _ = require('lodash/fp')

function replaceS3BucketFunctionWithAlias (bucket, functionAlias, functionName) {
  const lambdaConfigurations = _.get('Properties.NotificationConfiguration.LambdaConfigurations', bucket)
  const findTargetFunction = (configuration) => {
    const thisFunctionName = _.get('Function.Fn::GetAtt[0]', configuration)
    return thisFunctionName === functionName
  }
  const index = _.findIndex(findTargetFunction, lambdaConfigurations)
  return _.set(['Properties', 'NotificationConfiguration', 'LambdaConfigurations', index, 'Function'], { Ref: functionAlias }, bucket)
}

const S3 = {
  replaceS3BucketFunctionWithAlias
}

module.exports = S3
