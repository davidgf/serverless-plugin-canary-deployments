const _ = require('lodash/fp')

function replaceCloudWatchLogsDestinationArnWithAlias (cloudWatchLogs, functionAlias, functionName) {
  const targetArn = cloudWatchLogs.Properties.DestinationArn || {}
  const targetDetails = (targetArn['Fn::GetAtt'] || [])
  const [funcName] = targetDetails
  if (funcName && funcName === functionName) {
    return _.set('Properties.DestinationArn', { Ref: functionAlias }, cloudWatchLogs)
  }
  return cloudWatchLogs
}

const CloudWatchLogs = {
  replaceCloudWatchLogsDestinationArnWithAlias
}

module.exports = CloudWatchLogs
