function replaceCloudWatchEventRuleTargetWithAlias (cloudWatchEventRule, functionAlias, functionName) {
  const cloudWatchEventTargets = cloudWatchEventRule.Properties.Targets

  const updatedTargets = cloudWatchEventTargets.map(target => {
    const targetArn = target.Arn || {}
    const targetDetails = (targetArn['Fn::GetAtt'] || [])
    const [funcName] = targetDetails
    if (funcName && funcName === functionName) {
      target.Arn = { Ref: functionAlias }
    }
    return target
  })

  const updatedProperties = Object.assign({}, cloudWatchEventRule.Properties, { Targets: updatedTargets })
  return Object.assign({}, cloudWatchEventRule, { Properties: updatedProperties })
}

const CloudWatchEvents = {
  replaceCloudWatchEventRuleTargetWithAlias
}

module.exports = CloudWatchEvents
