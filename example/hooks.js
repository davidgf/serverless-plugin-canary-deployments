const aws = require('aws-sdk')
const codedeploy = new aws.CodeDeploy({ apiVersion: '2014-10-06' })

module.exports.pre = (event, context, callback) => {
  const deploymentId = event.DeploymentId
  const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId

  console.log('Check some stuff before shifting traffic...')

  const params = {
    deploymentId: deploymentId,
    lifecycleEventHookExecutionId: lifecycleEventHookExecutionId,
    status: 'Succeeded' // status can be 'Succeeded' or 'Failed'
  }

  return codedeploy.putLifecycleEventHookExecutionStatus(params).promise()
    .then(data => callback(null, 'Validation test succeeded'))
    .catch(() => callback(new Error('Validation test failed')))
}

module.exports.post = (event, context, callback) => {
  const deploymentId = event.DeploymentId
  const lifecycleEventHookExecutionId = event.LifecycleEventHookExecutionId

  console.log('Check some stuff after shifting traffic...')

  const params = {
    deploymentId: deploymentId,
    lifecycleEventHookExecutionId: lifecycleEventHookExecutionId,
    status: 'Succeeded' // status can be 'Succeeded' or 'Failed'
  }

  return codedeploy.putLifecycleEventHookExecutionStatus(params).promise()
    .then(data => callback(null, 'Validation test succeeded'))
    .catch(() => callback(new Error('Validation test failed')))
}
