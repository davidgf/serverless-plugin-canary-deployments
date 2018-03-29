function replaceS3BucketFunctionWithAlias(bucket, functionAlias, functionName) {
  const lambdaConfigurations = bucket.Properties.NotificationConfiguration.LambdaConfigurations;
  const newConfigurations = lambdaConfigurations.map((configuration) => {
    const functionObject = configuration.Function;
    const thisFunctionName = (functionObject['Fn::GetAtt'] || [])[0];
    if (thisFunctionName !== functionName) return configuration;
    return Object.assign({}, configuration, { Function: { Ref: functionAlias } });
  });
  const newNotificationCfonfiguration = Object.assign({}, bucket.Properties.NotificationConfiguration, { LambdaConfigurations: newConfigurations });
  const newProperties = Object.assign({}, bucket.Properties, { NotificationConfiguration: newNotificationCfonfiguration });
  return Object.assign({}, bucket, { Properties: newProperties });
}

const S3 = {
  replaceS3BucketFunctionWithAlias
};

module.exports = S3;
