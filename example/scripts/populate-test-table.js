const AWS = require('aws-sdk')
const uuid = require('uuid')

const generatePutRequest = () => ({ PutRequest: { Item: { id: uuid() } } })
const putRequests = new Array(25).fill().map(() => generatePutRequest())
const params = { RequestItems: { StreamsTestTable: putRequests } }

const documentClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' })

documentClient.batchWrite(params, (err, data) => {
  if (err) console.log(err)
  else console.log(data)
})
