const _ = require('lodash/fp')

function replaceIotTopicRuleActionArnWithAlias (iotTopicRule, functionAlias) {
  const newRule = _.set(
    'Properties.TopicRulePayload.Actions[0].Lambda.FunctionArn',
    { Ref: functionAlias },
    iotTopicRule
  )
  return newRule
}

const Iot = {
  replaceIotTopicRuleActionArnWithAlias
}

module.exports = Iot
