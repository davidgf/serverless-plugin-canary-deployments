const _ = require('lodash/fp')

function replaceElbV2TargetGroupWithAlias (targetGroup, functionAliasLogicalId, functionName) {
  const isFunctionAliasTarget = _.overSome([
    _.matchesProperty('Id.Fn::GetAtt[0]', functionName),
    _.matchesProperty('Id.Fn::Join[1][0].Fn::GetAtt[0]', functionName)
  ])
  targetGroup.Properties.Targets = targetGroup.Properties.Targets.map((target) => {
    if (isFunctionAliasTarget(target)) {
      return { Id: { Ref: functionAliasLogicalId } }
    }
    return target
  })
  return targetGroup
}

const ElasticLoadBalancingV2 = {
  replaceElbV2TargetGroupWithAlias
}

module.exports = ElasticLoadBalancingV2
