const fs = require('fs');
const path = require('path');
const chai = require('chai');
const _ = require('lodash/fp');
const { getInstalledPathSync } = require('get-installed-path');
const ServerlessCanaryDeployments = require('./serverless-plugin-canary-deployments');

const serverlessPath = getInstalledPathSync('serverless', { local: true });
const AwsProvider = require(`${serverlessPath}/lib/plugins/aws/provider/awsProvider`);
const Serverless = require(`${serverlessPath}/lib/Serverless`);
const { expect } = chai;
const fixturesPath = path.resolve(__dirname, 'fixtures');

describe('ServerlessCanaryDeployments', () => {
  const stage = 'dev';
  const options = { stage };

  describe('addCanaryDeploymentResources', () => {
    before(() => {
      const testCaseFiles = fs.readdirSync(fixturesPath);
      const getTestCaseName = _.pipe(_.split('.'), _.head);
      const testCaseFileType = _.pipe(_.split('.'), _.get('[1]'));
      const testCaseContentsFromFiles = _.reduce((acc, fileName) => {
        const contents = JSON.parse(fs.readFileSync(path.resolve(fixturesPath, fileName)));
        return _.set(testCaseFileType(fileName), contents, acc);
      }, {});
      const testCaseFilesByName = _.groupBy(getTestCaseName, testCaseFiles);
      this.testCases = _.map(
        caseName => testCaseContentsFromFiles(testCaseFilesByName[caseName]),
        Object.keys(testCaseFilesByName)
      );
    });

    it('generates the correct CloudFormation templates', () => {
      this.testCases.forEach(({ input, output, service }) => {
        const serverless = new Serverless(options);
        Object.assign(serverless.service, service);
        serverless.service.provider.compiledCloudFormationTemplate = input;
        serverless.setProvider('aws', new AwsProvider(serverless, options));
        const plugin = new ServerlessCanaryDeployments(serverless, options);
        plugin.addCanaryDeploymentResources();
        expect(serverless.service.provider.compiledCloudFormationTemplate).to.deep.equal(output);
      });
    });
  });
});
