const _ = require('lodash/fp')

// "HelloIotTopicRule1": {
//     "Type": "AWS::IoT::TopicRule",
//     "Properties": {
//       "TopicRulePayload": {
//         "RuleDisabled": "false",
//         "Sql": "SELECT * FROM 'some_topic'",
//         "Actions": [
//           {
//             "Lambda": {
//               "FunctionArn": {
//                 "Fn::GetAtt": [
//                   "HelloLambdaFunction",
//                   "Arn"
//                 ]
//               }
//             }
//           }
//         ]
//       }
//     }
//   },

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
