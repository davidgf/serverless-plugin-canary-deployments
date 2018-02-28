'use strict';

module.exports.hello = (event, context, callback) => {
  if ((event.queryStringParameters || {}).error) callback(new Error('Oh no!'));
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'First version',
    })
  };
  return callback(null, response);
};
