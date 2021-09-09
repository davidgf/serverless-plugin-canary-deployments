module.exports.hello = (event, context, callback) => {
  if ((event.queryStringParameters || {}).error) callback(new Error('Oh no!'))
  console.log('The second version')
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'The second version'
    })
  }
  return callback(null, response)
}

module.exports.authorize = (event, context, callback) => {
  console.log('The first authorizer')
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'The first authorizer version'
    })
  }
  return callback(null, response)
}
