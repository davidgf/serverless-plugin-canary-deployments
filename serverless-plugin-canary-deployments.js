const _ = require('lodash/fp');
const flattenObject = require('flat');
const CfGenerators = require('./lib/CfTemplateGenerators');

class ServerlessCanaryDeployments {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.awsProvider = this.serverless.getProvider('aws');
    this.naming = this.awsProvider.naming;
    this.service = this.serverless.service;
    this.hooks = {
      'before:package:finalize': this.addCanaryDeploymentResources.bind(this)
    };
  }

  get codeDeployAppName() {
    const stackName = this.naming.getStackName();
    const normalizedStackName = this.naming.normalizeNameToAlphaNumericOnly(stackName);
    return `${normalizedStackName}DeploymentApplication`;
  }

  get compiledTpl() {
    return this.service.provider.compiledCloudFormationTemplate;
  }

  get withDeploymentPreferencesFns() {
    return this.serverless.service.getAllFunctions()
      .filter(name => _.has('deploymentSettings', this.service.getFunction(name)));
  }

  get globalSettings() {
    return _.pathOr({}, 'custom.deploymentSettings', this.service);
  }

  get currentStage() {
    return this.awsProvider.getStage();
  }

  addCanaryDeploymentResources() {
    if (this.shouldDeployDeployGradually()) {
      const codeDeployApp = this.buildCodeDeployApp();
      const codeDeployRole = this.buildCodeDeployRole();
      const functionsResources = this.buildFunctionsResources();
      Object.assign(
        this.compiledTpl.Resources,
        codeDeployApp,
        codeDeployRole,
        ...functionsResources
      );
    }
  }

  shouldDeployDeployGradually() {
    return this.withDeploymentPreferencesFns.length > 0 && this.currentStageEnabled();
  }

  currentStageEnabled() {
    const enabledStages = _.getOr([], 'stages', this.globalSettings);
    return _.isEmpty(enabledStages) || _.includes(this.currentStage, enabledStages);
  }

  buildFunctionsResources() {
    return _.flatMap(
      serverlessFunction => this.buildFunctionResources(serverlessFunction),
      this.withDeploymentPreferencesFns
    );
  }

  buildFunctionResources(serverlessFnName) {
    const functionName = this.naming.getLambdaLogicalId(serverlessFnName);
    const deploymentSettings = this.getDeploymentSettingsFor(serverlessFnName);
    const deploymentGrTpl = this.buildFunctionDeploymentGroup({ deploymentSettings, functionName });
    const deploymentGroup = this.getResourceLogicalName(deploymentGrTpl);
    const aliasTpl = this.buildFunctionAlias({ deploymentSettings, functionName, deploymentGroup });
    const functionAlias = this.getResourceLogicalName(aliasTpl);
    const lambdaPermissions = this.buildPermissionsForAlias({ functionName, functionAlias });
    const eventsWithAlias = this.buildEventsForAlias({ functionName, functionAlias });

    return [deploymentGrTpl, aliasTpl, ...lambdaPermissions, ...eventsWithAlias];
  }

  buildCodeDeployApp() {
    const logicalName = this.codeDeployAppName;
    const template = CfGenerators.codeDeploy.buildApplication();
    return { [logicalName]: template };
  }

  buildCodeDeployRole() {
    if (this.globalSettings.codeDeployRole) return {};
    const logicalName = 'CodeDeployServiceRole';
    const template = CfGenerators.iam.buildCodeDeployRole();
    return { [logicalName]: template };
  }

  buildFunctionDeploymentGroup({ deploymentSettings, functionName }) {
    const logicalName = `${functionName}DeploymentGroup`;
    const params = {
      codeDeployAppName: this.codeDeployAppName,
      codeDeployRoleArn: deploymentSettings.codeDeployRole,
      deploymentSettings
    };
    const template = CfGenerators.codeDeploy.buildFnDeploymentGroup(params);
    return { [logicalName]: template };
  }

  buildFunctionAlias({ deploymentSettings = {}, functionName, deploymentGroup }) {
    const { alias } = deploymentSettings;
    const functionVersion = this.getVersionNameFor(functionName);
    const logicalName = `${functionName}Alias${alias}`;
    const beforeHookName = deploymentSettings.preTrafficHookName;
    const afterHookName = deploymentSettings.postTrafficHookName;
    const beforeHook = this.getFunctionName(deploymentSettings.preTrafficHook);
    const afterHook = this.getFunctionName(deploymentSettings.postTrafficHook);
    const trafficShiftingSettings = {
      codeDeployApp: this.codeDeployAppName,
      deploymentGroup,
      afterHookName,
      beforeHookName,
      afterHook,
      beforeHook
    };
    const template = CfGenerators.lambda.buildAlias({
      alias,
      functionName,
      functionVersion,
      trafficShiftingSettings
    });
    return { [logicalName]: template };
  }

  getFunctionName(slsFunctionName) {
    return slsFunctionName ? this.naming.getLambdaLogicalId(slsFunctionName) : null;
  }

  buildPermissionsForAlias({ functionName, functionAlias }) {
    const permissions = this.getLambdaPermissionsFor(functionName);
    return _.entries(permissions).map(([logicalName, template]) => {
      const templateWithAlias = CfGenerators.lambda
        .replacePermissionFunctionWithAlias(template, functionAlias);
      return { [logicalName]: templateWithAlias };
    });
  }

  buildEventsForAlias({ functionName, functionAlias }) {
    const replaceAliasStrategy = {
      'AWS::Lambda::EventSourceMapping': CfGenerators.lambda.replaceEventMappingFunctionWithAlias,
      'AWS::ApiGateway::Method': CfGenerators.apiGateway.replaceMethodUriWithAlias,
      'AWS::SNS::Topic': CfGenerators.sns.replaceTopicSubscriptionFunctionWithAlias,
      'AWS::S3::Bucket': CfGenerators.s3.replaceS3BucketFunctionWithAlias
    };
    const functionEvents = this.getEventsFor(functionName);
    const functionEventsEntries = _.entries(functionEvents);
    const eventsWithAlias = functionEventsEntries.map(([logicalName, event]) => {
      const evt = replaceAliasStrategy[event.Type](event, functionAlias, functionName);
      return { [logicalName]: evt };
    });
    return eventsWithAlias;
  }

  getEventsFor(functionName) {
    const apiGatewayMethods = this.getApiGatewayMethodsFor(functionName);
    const eventSourceMappings = this.getEventSourceMappingsFor(functionName);
    const snsTopics = this.getSnsTopicsFor(functionName);
    const s3Events = this.getS3EventsFor(functionName);
    return Object.assign({}, apiGatewayMethods, eventSourceMappings, snsTopics, s3Events);
  }

  getApiGatewayMethodsFor(functionName) {
    const isApiGMethod = _.matchesProperty('Type', 'AWS::ApiGateway::Method');
    const isMethodForFunction = _.pipe(
      _.prop('Properties.Integration'),
      flattenObject,
      _.includes(functionName)
    );
    const getMethodsForFunction = _.pipe(
      _.pickBy(isApiGMethod),
      _.pickBy(isMethodForFunction)
    );
    return getMethodsForFunction(this.compiledTpl.Resources);
  }

  getEventSourceMappingsFor(functionName) {
    const isEventSourceMapping = _.matchesProperty('Type', 'AWS::Lambda::EventSourceMapping');
    const isMappingForFunction = _.pipe(
      _.prop('Properties.FunctionName'),
      flattenObject,
      _.includes(functionName)
    );
    const getMappingsForFunction = _.pipe(
      _.pickBy(isEventSourceMapping),
      _.pickBy(isMappingForFunction)
    );
    return getMappingsForFunction(this.compiledTpl.Resources);
  }

  getSnsTopicsFor(functionName) {
    const isEventSourceMapping = _.matchesProperty('Type', 'AWS::SNS::Topic');
    const isMappingForFunction = _.pipe(
      _.prop('Properties.Subscription'),
      _.map(_.prop('Endpoint.Fn::GetAtt')),
      _.flatten,
      _.includes(functionName)
    );
    const getMappingsForFunction = _.pipe(
      _.pickBy(isEventSourceMapping),
      _.pickBy(isMappingForFunction)
    );
    return getMappingsForFunction(this.compiledTpl.Resources);
  }

  getS3EventsFor(functionName) {
    const isEventSourceMapping = _.matchesProperty('Type', 'AWS::S3::Bucket');
    const isMappingForFunction = _.pipe(
      _.prop('Properties.NotificationConfiguration.LambdaConfigurations'),
      _.map(_.prop('Function.Fn::GetAtt')),
      _.flatten,
      _.includes(functionName)
    );
    const getMappingsForFunction = _.pipe(
      _.pickBy(isEventSourceMapping),
      _.pickBy(isMappingForFunction)
    );
    return getMappingsForFunction(this.compiledTpl.Resources);
  }

  getVersionNameFor(functionName) {
    const isLambdaVersion = _.matchesProperty('Type', 'AWS::Lambda::Version');
    const isVersionForFunction = _.matchesProperty('Properties.FunctionName.Ref', functionName);
    const getVersionNameForFunction = _.pipe(
      _.pickBy(isLambdaVersion),
      _.findKey(isVersionForFunction)
    );
    return getVersionNameForFunction(this.compiledTpl.Resources);
  }

  getLambdaPermissionsFor(functionName) {
    const isLambdaPermission = _.matchesProperty('Type', 'AWS::Lambda::Permission');
    const isPermissionForFunction = _.matchesProperty('Properties.FunctionName.Fn::GetAtt[0]', functionName);
    const getPermissionForFunction = _.pipe(
      _.pickBy(isLambdaPermission),
      _.pickBy(isPermissionForFunction)
    );
    return getPermissionForFunction(this.compiledTpl.Resources);
  }

  getResourceLogicalName(resource) {
    return _.head(_.keys(resource));
  }

  getDeploymentSettingsFor(serverlessFunction) {
    const fnDeploymentSetting = this.service.getFunction(serverlessFunction).deploymentSettings;
    return Object.assign({}, this.globalSettings, fnDeploymentSetting);
  }
}

module.exports = ServerlessCanaryDeployments;
