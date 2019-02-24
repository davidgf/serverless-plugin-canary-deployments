const fs = require('fs')
const path = require('path')
const chai = require('chai')
const _ = require('lodash/fp')
const { getInstalledPathSync } = require('get-installed-path')
const ServerlessCanaryDeployments = require('./serverless-plugin-canary-deployments')

const serverlessPath = getInstalledPathSync('serverless', { local: true })
const AwsProvider = require(`${serverlessPath}/lib/plugins/aws/provider/awsProvider`)
const Serverless = require(`${serverlessPath}/lib/Serverless`)
const { expect } = chai
const fixturesPath = path.resolve(__dirname, 'fixtures')

describe('ServerlessCanaryDeployments', () => {
  const stage = 'dev'
  const options = { stage }

  describe('addCanaryDeploymentResources', () => {
    const testCaseFiles = fs.readdirSync(fixturesPath)
    const getTestCaseName = _.pipe(_.split('.'), _.head)
    const testCaseFileType = _.pipe(_.split('.'), _.get('[1]'))
    const testCaseContentsFromFiles = _.reduce((acc, fileName) => {
      const contents = JSON.parse(fs.readFileSync(path.resolve(fixturesPath, fileName)))
      return _.set(testCaseFileType(fileName), contents, acc)
    }, {})
    const testCaseFilesByName = _.groupBy(getTestCaseName, testCaseFiles)
    this.testCases = _.map(
      (caseName) => {
        const testCaseContents = testCaseContentsFromFiles(testCaseFilesByName[caseName])
        return Object.assign(testCaseContents, { caseName })
      },
      Object.keys(testCaseFilesByName)
    )

    this.testCases.forEach(({ caseName, input, output, service }) => {
      it(`generates the correct CloudFormation templates: test case ${caseName}`, () => {
        const serverless = new Serverless(options)
        Object.assign(serverless.service, service)
        serverless.service.provider.compiledCloudFormationTemplate = input
        serverless.setProvider('aws', new AwsProvider(serverless, options))
        const plugin = new ServerlessCanaryDeployments(serverless, options)
        plugin.addCanaryDeploymentResources()
        expect(serverless.service.provider.compiledCloudFormationTemplate).to.deep.equal(output)
      })
    })
  })

  describe('validate', () => {
    let serverless
    let plugin
    beforeEach(() => {
      serverless = new Serverless(options)
      plugin = new ServerlessCanaryDeployments(serverless, options)
    })

    it('should NOT throw an error if function deploymentSettings has both type and alias', () => {
      const deploymentSettings = {
        type: 'type',
        alias: 'alias'
      }
      expect(() => plugin.validate('func', deploymentSettings)).to.not.throw(Error)
    })

    it('should throw an error if type in function deploymentSettings is not a string', () => {
      const deploymentSettings = {
        type: undefined,
        alias: 'alias'
      }
      expect(() => plugin.validate('func', deploymentSettings)).to.throw(Error)
    })

    it('should throw an error if alias in function deploymentSettings is not a string', () => {
      const deploymentSettings = {
        type: 'type',
        alias: undefined
      }
      expect(() => plugin.validate('func', deploymentSettings)).to.throw(Error);
    })
  })
})
