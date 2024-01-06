const _ = require('lodash/fp')
const flattenObject = require('flat')
const CfGenerators = require('./lib/CfTemplateGenerators')
const {
  customPropertiesSchema,
  functionPropertiesSchema
} = require('./configSchemas')

const slsHasConfigSchema = sls =>
  sls.configSchemaHandler &&
  sls.configSchemaHandler.defineCustomProperties &&
  sls.configSchemaHandler.defineFunctionProperties
class ServerlessCanaryDeployments {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = options
    this.awsProvider = this.serverless.getProvider('aws')
    this.naming = this.awsProvider.naming
    this.service = this.serverless.service
    this.hooks = {
      'after:aws:package:finalize:mergeCustomProviderResources': this.addCanaryDeploymentResources.bind(this)
    }
    this.addConfigSchema()
  }

  get codeDeployAppName () {
    const stackName = this.naming.getStackName()
    const normalizedStackName = this.naming.normalizeNameToAlphaNumericOnly(stackName)
    return `${normalizedStackName}DeploymentApplication`
  }

  get compiledTpl () {
    return this.service.provider.compiledCloudFormationTemplate
  }

  get withDeploymentPreferencesFns () {
    return this.serverless.service.getAllFunctions()
      .filter(name => _.has('deploymentSettings', this.service.getFunction(name)))
  }

  get globalSettings () {
    return _.pathOr({}, 'custom.deploymentSettings', this.service)
  }

  get currentStage () {
    return this.awsProvider.getStage()
  }

  addConfigSchema () {
    if (slsHasConfigSchema(this.serverless)) {
      this.serverless.configSchemaHandler.defineCustomProperties(customPropertiesSchema)
      this.serverless.configSchemaHandler.defineFunctionProperties('aws', functionPropertiesSchema)
    }
  }

  addCanaryDeploymentResources () {
    if (this.shouldDeployDeployGradually()) {
      const codeDeployApp = this.buildCodeDeployApp()
      const functionsResources = this.buildFunctionsResources()
      const codeDeployRole = this.buildCodeDeployRole(this.areTriggerConfigurationsSet(functionsResources))
      const executionRole = this.buildExecutionRole()
      Object.assign(
        this.compiledTpl.Resources,
        codeDeployApp,
        codeDeployRole,
        executionRole,
        ...functionsResources
      )
    }
  }

  areTriggerConfigurationsSet (functionsResources) {
    // Checking if the template has trigger configurations.
    for (const resource of functionsResources) {
      for (const key of Object.keys(resource)) {
        if (resource[key].Type === 'AWS::CodeDeploy::DeploymentGroup') {
          if (resource[key].Properties.TriggerConfigurations) {
            return true
          }
        }
      }
    }
    return false
  }

  shouldDeployDeployGradually () {
    return this.withDeploymentPreferencesFns.length > 0 && this.currentStageEnabled()
  }

  currentStageEnabled () {
    const enabledStages = _.getOr([], 'stages', this.globalSettings)
    return _.isEmpty(enabledStages) || _.includes(this.currentStage, enabledStages)
  }

  buildExecutionRole () {
    const logicalName = this.naming.getRoleLogicalId()

    const inputRole = this.compiledTpl.Resources[logicalName]
    if (!inputRole) {
      return
    }
    const hasHook = _.pipe(
      this.getDeploymentSettingsFor.bind(this),
      settings => settings.preTrafficHook || settings.postTrafficHook
    )
    const getDeploymentGroup = _.pipe(
      this.getFunctionName.bind(this),
      this.getFunctionDeploymentGroupId.bind(this),
      this.getDeploymentGroupName.bind(this)
    )
    const deploymentGroups = _.pipe(
      _.filter(hasHook),
      _.map(getDeploymentGroup)
    )(this.withDeploymentPreferencesFns)

    const outputRole = CfGenerators.iam.buildExecutionRoleWithCodeDeploy(inputRole, this.codeDeployAppName, deploymentGroups)

    return { [logicalName]: outputRole }
  }

  buildFunctionsResources () {
    return _.flatMap(
      serverlessFunction => this.buildFunctionResources(serverlessFunction),
      this.withDeploymentPreferencesFns
    )
  }

  buildFunctionResources (serverlessFunctionName) {
    const functionName = this.naming.getLambdaLogicalId(serverlessFunctionName)
    const deploymentSettings = this.getDeploymentSettingsFor(serverlessFunctionName)
    const deploymentGrTpl = this.buildFunctionDeploymentGroup({ deploymentSettings, functionName })
    const deploymentGroup = this.getResourceLogicalName(deploymentGrTpl)
    const targetAlias = this.getFunctionTargetAlias(serverlessFunctionName)
    const aliasTpl = this.buildFunctionAlias({ deploymentSettings, functionName, deploymentGroup, targetAlias })
    const functionAliasLogicalId = this.getResourceLogicalName(aliasTpl)
    const lambdaPermissions = this.buildPermissionsForAlias({ functionName, functionAliasLogicalId, targetAlias })
    const eventsWithAlias = this.buildEventsForAlias({ functionName, functionAliasLogicalId })
    this.setFunctionTargetAlias(serverlessFunctionName, functionAliasLogicalId, deploymentSettings.alias)
    return [deploymentGrTpl, aliasTpl, ...lambdaPermissions, ...eventsWithAlias]
  }

  setFunctionTargetAlias (serverlessFunctionName, aliasLogicalId, aliasName) {
    this.service.getFunction(serverlessFunctionName).targetAlias = { name: aliasName, logicalId: aliasLogicalId }
  }

  getFunctionTargetAlias (serverlessFunctionName) {
    const { targetAlias } = this.service.getFunction(serverlessFunctionName)
    return targetAlias
  }

  getFunctionTargetAliasTemplate (targetAlias) {
    if (targetAlias) {
      return this.compiledTpl.Resources[targetAlias.logicalId]
    }
  }

  buildCodeDeployApp () {
    const logicalName = this.codeDeployAppName
    const template = CfGenerators.codeDeploy.buildApplication()
    return { [logicalName]: template }
  }

  buildCodeDeployRole (areTriggerConfigurationsSet) {
    if (this.globalSettings.codeDeployRole) return {}
    const logicalName = 'CodeDeployServiceRole'
    const template = CfGenerators.iam.buildCodeDeployRole(this.globalSettings.codeDeployRolePermissionsBoundary, areTriggerConfigurationsSet)
    return { [logicalName]: template }
  }

  buildFunctionDeploymentGroup ({ deploymentSettings, functionName }) {
    const logicalName = this.getFunctionDeploymentGroupId(functionName)
    const codeDeployGroupName = this.getDeploymentGroupName(logicalName)
    const params = {
      codeDeployAppName: this.codeDeployAppName,
      codeDeployGroupName,
      codeDeployRoleArn: deploymentSettings.codeDeployRole,
      deploymentSettings
    }
    const template = CfGenerators.codeDeploy.buildFnDeploymentGroup(params)
    return { [logicalName]: template }
  }

  buildFunctionAlias ({ deploymentSettings = {}, functionName, deploymentGroup, targetAlias }) {
    const { alias } = deploymentSettings
    const functionVersion = this.getVersionNameFor(functionName)
    const logicalName = targetAlias ? targetAlias.logicalId : `${functionName}Alias${alias}`
    const beforeHook = this.getFunctionName(deploymentSettings.preTrafficHook)
    const afterHook = this.getFunctionName(deploymentSettings.postTrafficHook)
    const trafficShiftingSettings = {
      codeDeployApp: this.codeDeployAppName,
      deploymentGroup,
      afterHook,
      beforeHook
    }
    const targetAliasTemplate = this.getFunctionTargetAliasTemplate(targetAlias)
    const template = CfGenerators.lambda.buildAlias({
      alias,
      functionName,
      functionVersion,
      trafficShiftingSettings,
      targetAliasTemplate
    })
    return { [logicalName]: template }
  }

  getFunctionDeploymentGroupId (functionLogicalId) {
    return `${functionLogicalId}DeploymentGroup`
  }

  getDeploymentGroupName (deploymentGroupLogicalId) {
    return `${this.naming.getStackName()}-${deploymentGroupLogicalId}`.slice(0, 100)
  }

  getFunctionName (serverlessFunctionName) {
    return serverlessFunctionName ? this.naming.getLambdaLogicalId(serverlessFunctionName) : null
  }

  buildPermissionsForAlias ({ functionName, functionAliasLogicalId, targetAlias }) {
    const permissions = this.getLambdaPermissionsFor(functionName)
    return _.entries(permissions).map(([logicalName, template]) => {
      const templateWithAlias = CfGenerators.lambda
        .replacePermissionFunctionWithAlias(template, functionAliasLogicalId, targetAlias)
      return { [logicalName]: templateWithAlias }
    })
  }

  buildEventsForAlias ({ functionName, functionAliasLogicalId }) {
    const replaceAliasStrategy = {
      'AWS::Lambda::EventSourceMapping': CfGenerators.lambda.replaceEventMappingFunctionWithAlias,
      'AWS::ApiGateway::Method': CfGenerators.apiGateway.replaceMethodUriWithAlias,
      'AWS::ApiGatewayV2::Integration': CfGenerators.apiGateway.replaceV2IntegrationUriWithAlias,
      'AWS::ApiGatewayV2::Authorizer': CfGenerators.apiGateway.replaceV2AuthorizerUriWithAlias,
      'AWS::SNS::Topic': CfGenerators.sns.replaceTopicSubscriptionFunctionWithAlias,
      'AWS::SNS::Subscription': CfGenerators.sns.replaceSubscriptionFunctionWithAlias,
      'AWS::S3::Bucket': CfGenerators.s3.replaceS3BucketFunctionWithAlias,
      'AWS::Events::Rule': CfGenerators.cloudWatchEvents.replaceCloudWatchEventRuleTargetWithAlias,
      'AWS::Logs::SubscriptionFilter': CfGenerators.cloudWatchLogs.replaceCloudWatchLogsDestinationArnWithAlias,
      'AWS::IoT::TopicRule': CfGenerators.iot.replaceIotTopicRuleActionArnWithAlias,
      'AWS::AppSync::DataSource': CfGenerators.appSync.replaceAppSyncDataSourceWithAlias,
      'AWS::ElasticLoadBalancingV2::TargetGroup': CfGenerators.elasticLoadBalancingV2.replaceElbV2TargetGroupWithAlias
    }
    const functionEvents = this.getEventsFor(functionName)
    const functionEventsEntries = _.entries(functionEvents)
    const eventsWithAlias = functionEventsEntries.map(([logicalName, event]) => {
      const evt = replaceAliasStrategy[event.Type](event, functionAliasLogicalId, functionName)
      return { [logicalName]: evt }
    })
    return eventsWithAlias
  }

  getEventsFor (functionName) {
    const apiGatewayMethods = this.getApiGatewayMethodsFor(functionName)
    const apiGatewayV2Methods = this.getApiGatewayV2MethodsFor(functionName)
    const apiGatewayV2Authorizers = this.getApiGatewayV2AuthorizersFor(functionName)
    const eventSourceMappings = this.getEventSourceMappingsFor(functionName)
    const snsTopics = this.getSnsTopicsFor(functionName)
    const snsSubscriptions = this.getSnsSubscriptionsFor(functionName)
    const s3Events = this.getS3EventsFor(functionName)
    const cloudWatchEvents = this.getCloudWatchEventsFor(functionName)
    const cloudWatchLogs = this.getCloudWatchLogsFor(functionName)
    const iotTopicRules = this.getIotTopicRulesFor(functionName)
    const appSyncDataSources = this.getAppSyncDataSourcesFor(functionName)
    const elbV2TargetGroups = this.getElbV2TargetGroupsFor(functionName)
    return Object.assign(
      {},
      apiGatewayMethods,
      apiGatewayV2Methods,
      apiGatewayV2Authorizers,
      eventSourceMappings,
      snsTopics,
      s3Events,
      cloudWatchEvents,
      cloudWatchLogs,
      snsSubscriptions,
      iotTopicRules,
      appSyncDataSources,
      elbV2TargetGroups
    )
  }

  getApiGatewayMethodsFor (functionName) {
    const isApiGMethod = _.matchesProperty('Type', 'AWS::ApiGateway::Method')
    const isMethodForFunction = _.pipe(
      _.prop('Properties.Integration'),
      flattenObject,
      _.includes(functionName)
    )
    const getMethodsForFunction = _.pipe(
      _.pickBy(isApiGMethod),
      _.pickBy(isMethodForFunction)
    )
    return getMethodsForFunction(this.compiledTpl.Resources)
  }

  getApiGatewayV2MethodsFor (functionName) {
    const isApiGMethod = _.matchesProperty('Type', 'AWS::ApiGatewayV2::Integration')
    const isMethodForFunction = _.pipe(
      _.prop('Properties.IntegrationUri'),
      flattenObject,
      _.includes(functionName)
    )
    const getMethodsForFunction = _.pipe(
      _.pickBy(isApiGMethod),
      _.pickBy(isMethodForFunction)
    )
    return getMethodsForFunction(this.compiledTpl.Resources)
  }

  getApiGatewayV2AuthorizersFor (functionName) {
    const isApiGMethod = _.matchesProperty('Type', 'AWS::ApiGatewayV2::Authorizer')
    const isMethodForFunction = _.pipe(
      _.prop('Properties.AuthorizerUri'),
      flattenObject,
      _.includes(functionName)
    )
    const getMethodsForFunction = _.pipe(
      _.pickBy(isApiGMethod),
      _.pickBy(isMethodForFunction)
    )
    return getMethodsForFunction(this.compiledTpl.Resources)
  }

  getEventSourceMappingsFor (functionName) {
    const isEventSourceMapping = _.matchesProperty('Type', 'AWS::Lambda::EventSourceMapping')
    const isMappingForFunction = _.pipe(
      _.prop('Properties.FunctionName'),
      flattenObject,
      _.includes(functionName)
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isEventSourceMapping),
      _.pickBy(isMappingForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getSnsTopicsFor (functionName) {
    const isSnsTopic = _.matchesProperty('Type', 'AWS::SNS::Topic')
    const isMappingForFunction = _.pipe(
      _.prop('Properties.Subscription'),
      _.map(_.prop('Endpoint.Fn::GetAtt')),
      _.flatten,
      _.includes(functionName)
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isSnsTopic),
      _.pickBy(isMappingForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getSnsSubscriptionsFor (functionName) {
    const isSnsSubscription = _.matchesProperty('Type', 'AWS::SNS::Subscription')
    const isSubscriptionForFunction = _.matchesProperty('Properties.Endpoint.Fn::GetAtt[0]', functionName)
    const getMappingsForFunction = _.pipe(
      _.pickBy(isSnsSubscription),
      _.pickBy(isSubscriptionForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getCloudWatchEventsFor (functionName) {
    const isCloudWatchEvent = _.matchesProperty('Type', 'AWS::Events::Rule')
    const isCwEventForFunction = _.pipe(
      _.prop('Properties.Targets'),
      _.map(_.prop('Arn.Fn::GetAtt')),
      _.flatten,
      _.includes(functionName)
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isCloudWatchEvent),
      _.pickBy(isCwEventForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getCloudWatchLogsFor (functionName) {
    const isLogSubscription = _.matchesProperty('Type', 'AWS::Logs::SubscriptionFilter')
    const isLogSubscriptionForFn = _.pipe(
      _.prop('Properties.DestinationArn.Fn::GetAtt'),
      _.flatten,
      _.includes(functionName)
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isLogSubscription),
      _.pickBy(isLogSubscriptionForFn)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getS3EventsFor (functionName) {
    const isS3Event = _.matchesProperty('Type', 'AWS::S3::Bucket')
    const isS3EventForFunction = _.pipe(
      _.prop('Properties.NotificationConfiguration.LambdaConfigurations'),
      _.map(_.prop('Function.Fn::GetAtt')),
      _.flatten,
      _.includes(functionName)
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isS3Event),
      _.pickBy(isS3EventForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getIotTopicRulesFor (functionName) {
    const isIotTopicRule = _.matchesProperty('Type', 'AWS::IoT::TopicRule')
    const isIotTopicRuleForFunction = _.matchesProperty(
      'Properties.TopicRulePayload.Actions[0].Lambda.FunctionArn.Fn::GetAtt[0]',
      functionName
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isIotTopicRule),
      _.pickBy(isIotTopicRuleForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getAppSyncDataSourcesFor (functionName) {
    const isAppSyncDataSource = _.matchesProperty('Type', 'AWS::AppSync::DataSource')
    const isAppSyncDataSourceForFunction = _.matchesProperty(
      'Properties.LambdaConfig.LambdaFunctionArn.Fn::GetAtt[0]',
      functionName
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isAppSyncDataSource),
      _.pickBy(isAppSyncDataSourceForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getElbV2TargetGroupsFor (functionName) {
    const isElbV2TargetGroup = _.matchesProperty('Type', 'AWS::ElasticLoadBalancingV2::TargetGroup')
    const isElbV2TargetGroupForFunction = _.pipe(
      _.prop('Properties.Targets'),
      _.some(
        _.overSome([
          _.matchesProperty('Id.Fn::GetAtt[0]', functionName),
          _.matchesProperty('Id.Fn::Join[1][0].Fn::GetAtt[0]', functionName)
        ]))
    )
    const getMappingsForFunction = _.pipe(
      _.pickBy(isElbV2TargetGroup),
      _.pickBy(isElbV2TargetGroupForFunction)
    )
    return getMappingsForFunction(this.compiledTpl.Resources)
  }

  getVersionNameFor (functionName) {
    const isLambdaVersion = _.matchesProperty('Type', 'AWS::Lambda::Version')
    const isVersionForFunction = _.matchesProperty('Properties.FunctionName.Ref', functionName)
    const getVersionNameForFunction = _.pipe(
      _.pickBy(isLambdaVersion),
      _.findKey(isVersionForFunction)
    )
    return getVersionNameForFunction(this.compiledTpl.Resources)
  }

  getLambdaPermissionsFor (functionName) {
    const isLambdaPermission = _.matchesProperty('Type', 'AWS::Lambda::Permission')
    const isPermissionForFunction = _.overSome([
      _.matchesProperty('Properties.FunctionName.Fn::GetAtt[0]', functionName),
      _.matchesProperty('Properties.FunctionName.Fn::Join[1][0].Fn::GetAtt[0]', functionName),
      _.matchesProperty('Properties.FunctionName.Ref', functionName)
    ])

    const getPermissionForFunction = _.pipe(
      _.pickBy(isLambdaPermission),
      _.pickBy(isPermissionForFunction)
    )

    return getPermissionForFunction(this.compiledTpl.Resources)
  }

  getResourceLogicalName (resource) {
    return _.head(_.keys(resource))
  }

  getDeploymentSettingsFor (serverlessFunctionName) {
    const fnDeploymentSetting = this.service.getFunction(serverlessFunctionName).deploymentSettings
    return Object.assign({}, this.globalSettings, fnDeploymentSetting)
  }
}

module.exports = ServerlessCanaryDeployments
