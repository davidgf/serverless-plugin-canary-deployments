const { expect } = require('chai');
const _ = require('lodash/fp');
const CodeDeploy = require('./CodeDeploy');

const defaultTriggerConfig = snsTopic => [
  {
    TriggerEvents: [ 'DeploymentStart',
      'DeploymentSuccess',
      'DeploymentFailure',
      'DeploymentStop',
      'DeploymentRollback',
      'DeploymentReady',
      'InstanceStart',
      'InstanceSuccess',
      'InstanceFailure',
      'InstanceReady'],
    TriggerName: 'all_events',
    TriggerTargetArn : snsTopic
  }
];

describe('CodeDeploy', () => {
  describe('.buildApplication', () => {
    it('generates a CodeDeploy::Application resouce', () => {
      const expected = {
        Type: 'AWS::CodeDeploy::Application',
        Properties: { ComputePlatform: 'Lambda' }
      };
      const actual = CodeDeploy.buildApplication();
      expect(actual).to.deep.equal(expected);
    });
  });

  describe('.buildFnDeploymentGroup', () => {
    const codeDeployAppName = 'MyCDApp';
    const baseDeploymentGroup = {
      Type: 'AWS::CodeDeploy::DeploymentGroup',
      Properties: {
        ApplicationName: {
          Ref: ''
        },
        AutoRollbackConfiguration: {
          Enabled: true,
          Events: [
            'DEPLOYMENT_FAILURE',
            'DEPLOYMENT_STOP_ON_ALARM',
            'DEPLOYMENT_STOP_ON_REQUEST'
          ]
        },
        ServiceRoleArn: {
          'Fn::GetAtt': [
            'CodeDeployServiceRole',
            'Arn'
          ]
        },
        DeploymentConfigName: {
          'Fn::Sub': [
            'CodeDeployDefault.Lambda${ConfigName}',
            { ConfigName: '' }
          ]
        },
        DeploymentStyle: {
          DeploymentType: 'BLUE_GREEN',
          DeploymentOption: 'WITH_TRAFFIC_CONTROL'
        }
      }
    };

    it('should generate a CodeDeploy::DeploymentGroup resouce for the provided function', () => {
      const deploymentSettings = {
        type: 'Linear10PercentEvery1Minute',
        alarms: [ 'Alarm1', 'Alarm2' ],
        snsTopic: 'testSnsTopic'
      };
      const expectedAlarms = {
        Alarms: [ { Name: { Ref: 'Alarm1' } }, { Name: { Ref: 'Alarm2' } }],
        Enabled: true
      };
      const expected = _.pipe(
        _.set('Properties.ApplicationName', { Ref: codeDeployAppName }),
        _.set('Properties.AlarmConfiguration', expectedAlarms),
        _.set('Properties.DeploymentConfigName.Fn::Sub[1].ConfigName', deploymentSettings.type),
        _.set('Properties.TriggerConfigurations', defaultTriggerConfig(deploymentSettings.snsTopic))
      )(baseDeploymentGroup);
      const actual = CodeDeploy.buildFnDeploymentGroup({ codeDeployAppName, deploymentSettings });
      expect(actual).to.deep.equal(expected);
    });

    context('when no alarms were provided', () => {
      it('should not include the AlarmConfiguration property', () => {
        const deploymentSettings = { type: 'Linear10PercentEvery1Minute' };
        const expected = _.pipe(
          _.set('Properties.ApplicationName', { Ref: codeDeployAppName }),
          _.set('Properties.DeploymentConfigName.Fn::Sub[1].ConfigName', deploymentSettings.type)
        )(baseDeploymentGroup);
        const actual = CodeDeploy.buildFnDeploymentGroup({ codeDeployAppName, deploymentSettings });
        expect(actual).to.deep.equal(expected);
      });
    });

    context('when a codeDeploy role is provided', () => {
      it('should include the arn of the existing role instead of trying to lookup a generated role', () => {
        const deploymentSettings = { type: 'Linear10PercentEvery1Minute', snsTopic: 'testSnsTopic2' };

        const codeDeployRoleArn = 'existing_role_arn';
        const expected = _.pipe(
          _.set('Properties.ServiceRoleArn', codeDeployRoleArn),
          _.set('Properties.ApplicationName', { Ref: codeDeployAppName }),
          _.set('Properties.DeploymentConfigName.Fn::Sub[1].ConfigName', deploymentSettings.type),
          _.set('Properties.TriggerConfigurations', defaultTriggerConfig(deploymentSettings.snsTopic))
        )(baseDeploymentGroup);
        const actual = CodeDeploy.buildFnDeploymentGroup({
          codeDeployAppName, codeDeployRoleArn, deploymentSettings });
        expect(actual).to.deep.equal(expected);
      });
    });
  });
});
