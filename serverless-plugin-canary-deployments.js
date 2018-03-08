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

  addCanaryDeploymentResources() {
    if (this.withDeploymentPreferencesFns.length > 0) {
      const codeDeployApp = this.buildCodeDeployApp();
      const codeDeployRole = this.buildCodeDeployRole();
      const functionsResources = this.buildFunctionsResources();
      Object.assign(
        this.compiledTpl.Resources,
        codeDeployApp,
        codeDeployRole,
        ...functionsResources
      );
      // console.log(JSON.stringify(this.compiledTpl))
    }
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
    const lambdaPermission = this.buildPermissionForAlias({ functionName, functionAlias });
    const eventsWithAlias = this.buildEventsForAlias({ functionName, functionAlias});
    return [deploymentGrTpl, aliasTpl, lambdaPermission, ...eventsWithAlias];
  }

  buildCodeDeployApp() {
    const logicalName = this.codeDeployAppName;
    const template = CfGenerators.codeDeploy.buildApplication();
    return { [logicalName]: template };
  }

  buildCodeDeployRole() {
    const logicalName = 'CodeDeployServiceRole';
    const template = CfGenerators.iam.buildCodeDeployRole();
    return { [logicalName]: template };
  }

  buildFunctionDeploymentGroup({ deploymentSettings, functionName }) {
    const logicalName = `${functionName}DeploymentGroup`;
    const params = {
      codeDeployAppName: this.codeDeployAppName,
      deploymentSettings
    };
    const template = CfGenerators.codeDeploy.buildFnDeploymentGroup(params);
    return { [logicalName]: template };
  }

  buildFunctionAlias({ deploymentSettings = {}, functionName, deploymentGroup }) {
    const { alias } = deploymentSettings;
    const functionVersion = this.getVersionNameFor(functionName);
    const logicalName = `${functionName}Alias${alias}`;

    const beforeHook = _.prop(deploymentSettings, 'preTrafficHook');
    const afterHook = _.(deploymentSettings, 'postTrafficHook');

    const trafficShiftingSettings = {
      codeDeployApp: this.codeDeployAppName,
      deploymentGroup,
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

  buildPermissionForAlias({ functionName, functionAlias }) {
    const permission = this.getLambdaPermissionFor(functionName);
    const [logicalName, template] = Object.entries(permission)[0];
    const templateWithAlias = CfGenerators.lambda.replacePermissionFunctionWithAlias(template, functionAlias);
    return { [logicalName]: templateWithAlias };
  }

  buildEventsForAlias({ functionName, functionAlias }) {
    const functionEvents = this.getEventsFor(functionName);
    const functionEventsEntries = Object.entries(functionEvents);
    const eventsWithAlias = functionEventsEntries.map(([logicalName, event]) => {
      const evt = CfGenerators.apiGateway.replaceMethodUriWithAlias(event, functionAlias);
      return { [logicalName]: evt };
    });
    return eventsWithAlias;
  }

  getEventsFor(functionName) {
    return this.getApiGatewayMethodsFor(functionName);
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

  getVersionNameFor(functionName) {
    const isLambdaVersion = _.matchesProperty('Type', 'AWS::Lambda::Version');
    const isVersionForFunction = _.matchesProperty('Properties.FunctionName.Ref', functionName);
    const getVersionNameForFunction = _.pipe(
      _.pickBy(isLambdaVersion),
      _.findKey(isVersionForFunction),
    );
    return getVersionNameForFunction(this.compiledTpl.Resources);
  }

  getLambdaPermissionFor(functionName) {
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
    const globalSettings = _.cloneDeep(_.prop(this.service, 'custom', 'deploymentSettings'));
    const fnDeploymentSetting = this.service.getFunction(serverlessFunction).deploymentSettings;
    return Object.assign({}, globalSettings, fnDeploymentSetting);
  }
}

module.exports = ServerlessCanaryDeployments;
