function replaceTopicSubscriptionFunctionWithAlias(snsTopic, functionAlias, functionName) {
  const subscriptions = snsTopic.Properties.Subscription;

  const isTargetSubscription = (subscription) => {
    const endpoint = subscription.Endpoint || {};
    const funcDetails = (endpoint['Fn::GetAtt'] || []);
    const [funcName] = funcDetails;
    return funcName ? funcName === functionName : false;
  };

  const restOfSubscriptions = subscriptions.filter(subscription => !isTargetSubscription(subscription));
  const subscriptionWithAlias = { Endpoint: { Ref: functionAlias }, Protocol: 'lambda' };
  const newSubscriptions = [...restOfSubscriptions, subscriptionWithAlias];

  const newProperties = { ...snsTopic.Properties, Subscription: newSubscriptions };
  return { ...snsTopic, Properties: newProperties };
}

const Sns = {
  replaceTopicSubscriptionFunctionWithAlias
};

module.exports = Sns;
