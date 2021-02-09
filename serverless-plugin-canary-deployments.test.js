const fs = require('fs')
const path = require('path')
const chai = require('chai')
const _ = require('lodash/fp')
const { getInstalledPathSync } = require('get-installed-path')
const ServerlessCanaryDeployments = require('./serverless-plugin-canary-deployments')

const serverlessPath = getInstalledPathSync('serverless', { local: true })
const Serverless = require(`${serverlessPath}/lib/Serverless`)
const serverlessVersion = parseInt((new Serverless()).version)
const AwsProvider = serverlessVersion > 1
  ? require(`${serverlessPath}/lib/plugins/aws/provider`)
  : require(`${serverlessPath}/lib/plugins/aws/provider/awsProvider`)
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
})
