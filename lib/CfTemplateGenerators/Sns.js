function replaceTopicSubscriptionFunctionWithAlias (
  snsTopic,
  functionAlias,
  functionName
) {
  const subscriptions = snsTopic.Properties.Subscription

  const isTargetSubscription = (subscription) => {
    const endpoint = subscription.Endpoint || {}
    const funcDetails = endpoint['Fn::GetAtt'] || []
    const [funcName] = funcDetails
    return funcName ? funcName === functionName : false
  }

  const restOfSubscriptions = subscriptions.filter(s => !isTargetSubscription(s))
  const subscriptionWithAlias = {
    Endpoint: { Ref: functionAlias },
    Protocol: 'lambda'
  }
  const newSubscriptions = [...restOfSubscriptions, subscriptionWithAlias]

  const newProperties = Object.assign({}, snsTopic.Properties, {
    Subscription: newSubscriptions
  })
  return Object.assign({}, snsTopic, { Properties: newProperties })
}

function replaceSubscriptionFunctionWithAlias (
  subscription,
  functionAlias,
  functionName
) {
  if (subscription.Properties.Protocol !== 'lambda') return subscription

  const isTargetSubscription = () => {
    const endpoint = subscription.Properties.Endpoint || {}
    const funcDetails = endpoint['Fn::GetAtt'] || []
    const [funcName] = funcDetails
    return funcName ? funcName === functionName : false
  }

  if (!isTargetSubscription()) {
    return subscription
  }
  const newEndpoint = {
    Ref: functionAlias
  }
  const newProperties = Object.assign({}, subscription.Properties, {
    Endpoint: newEndpoint
  })
  return Object.assign({}, subscription, { Properties: newProperties })
}

const Sns = {
  replaceTopicSubscriptionFunctionWithAlias,
  replaceSubscriptionFunctionWithAlias
}

module.exports = Sns
