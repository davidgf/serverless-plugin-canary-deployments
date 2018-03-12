const CodeDeploy = require('./CodeDeploy');
const Iam = require('./Iam');
const Lambda = require('./Lambda');
const ApiGateway = require('./ApiGateway');
const Sns = require('./Sns');

module.exports.codeDeploy = CodeDeploy;
module.exports.iam = Iam;
module.exports.lambda = Lambda;
module.exports.apiGateway = ApiGateway;
module.exports.sns = Sns;
