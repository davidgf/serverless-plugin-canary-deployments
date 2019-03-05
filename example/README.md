# Serverless Plugin Canary Deployments Example

Let's see the plugin in action :smile: In this service example we'll create several resources:

* A Lambda function with an HTTP event where we'll test the gradual deploy
* A before and an after traffic shifting hooks
* An alarm that sets off if the Lambda function exits with error status

The function's deployment is configured so that it shifts a 10% of the traffic to the new version every minute, as long as the alarm status is OK.

## Usage

First, we need to set up the service and deploy it in our AWS account:

```console
$ npm i
$ sls deploy -s dev
```

When you call your newly created endpoint, you should see the following message:

```console
$ curl https://yourendpoint.com/dev/hello
{"message":"First version"}
```

To check how traffic is shifted gradually, modify `handler.js` and deploy your service again. You'll see that the output varies across endpoint calls.

```console
$ sls deploy -s dev
$ curl https://yourendpoint.com/dev/hello
{"message":"First version"}
$ curl https://yourendpoint.com/dev/hello
{"message":"Second version"}
```

If we wanted to check how our deployment rolls back to the previous version, we need to set off the alarm. Calling the endpoint with `error` as a query parameter will cause the function with error status.

```console
$ curl https://yourendpoint.com/dev/hello?error=true
{"message": "Internal server error"}
```

As soon as the alarm turns to `ALARM` state, all the traffic will be shifted to the previous version. You can check progress of the deployment in the [CodeDeploy console](https://console.aws.amazon.com/codedeploy/home).
