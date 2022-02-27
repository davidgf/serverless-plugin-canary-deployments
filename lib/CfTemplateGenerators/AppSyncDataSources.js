function replaceAppSyncDataSourceWithAlias (dataSource, functionAlias, functionName) {
  if (dataSource.Properties.Type !== 'AWS_LAMBDA') return dataSource
  const isDataSourceLambda = () => {
    const lambda = dataSource.Properties.LambdaConfig.LambdaFunctionArn || {}
    const funcDetails = lambda['Fn::GetAtt'] || []
    const [funcName] = funcDetails
    return funcName ? funcName === functionName : false
  }
  if (!isDataSourceLambda()) {
    return dataSource
  }

  const newLambda = {
    Ref: functionAlias
  }

  const newProperties = Object.assign({}, dataSource.Properties, {
    LambdaConfig: {
      LambdaFunctionArn: newLambda
    }
  })

  return Object.assign({}, dataSource, { Properties: newProperties })
}

const AppSyncDataSources = {
  replaceAppSyncDataSourceWithAlias
}

module.exports = AppSyncDataSources
