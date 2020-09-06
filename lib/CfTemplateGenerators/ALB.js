const _ = require('lodash/fp')

function replaceTargetGroupWithAlias (albTargetGroup, functionAlias) {
  const aliasRef = { Ref: functionAlias }
  const newTarget = _.set('Properties.Targets[0].Id', aliasRef, albTargetGroup)
  return newTarget
}

const ALB = {
  replaceTargetGroupWithAlias
}

module.exports = ALB
