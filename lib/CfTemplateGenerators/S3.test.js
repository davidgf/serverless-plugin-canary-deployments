const { expect } = require('chai')
const S3 = require('./S3')

describe('S3', () => {
  describe('.replaceS3BucketFunctionWithAlias', () => {
    const functionName = 'HelloLambdaFunction'
    const s3Bucket = {
      Type: 'AWS::S3::Bucket',
      Properties: {
        BucketName: 's3SampleBucket',
        NotificationConfiguration: {
          LambdaConfigurations: [{
            Event: 's3:ObjectCreated:*',
            Function: {
              'Fn::GetAtt': [
                'HelloLambdaFunction',
                'Arn'
              ]
            },
            Filter: {
              S3Key: {
                Rules: [{
                  Name: 'prefix',
                  Value: 'uploads/'
                },
                {
                  Name: 'suffix',
                  Value: '.jpg'
                }
                ]
              }
            }
          }, {
            Event: 's3:ObjectRemoved:*',
            Function: {
              'Fn::GetAtt': [
                'HelloWorldLambdaFunction',
                'Arn'
              ]
            }
          }]
        }
      },
      DependsOn: [
        'HelloLambdaPermissionS3SampleBucketS3',
        'HelloWorldLambdaPermissionS3SampleBucketS3'
      ]
    }

    it('replaces the s3 lambda function for an alias', () => {
      const functionAlias = 'TheFunctionAlias'
      const expected = {
        Type: 'AWS::S3::Bucket',
        Properties: {
          BucketName: 's3SampleBucket',
          NotificationConfiguration: {
            LambdaConfigurations: [{
              Event: 's3:ObjectCreated:*',
              Function: {
                Ref: 'TheFunctionAlias'
              },
              Filter: {
                S3Key: {
                  Rules: [{
                    Name: 'prefix',
                    Value: 'uploads/'
                  },
                  {
                    Name: 'suffix',
                    Value: '.jpg'
                  }
                  ]
                }
              }
            }, {
              Event: 's3:ObjectRemoved:*',
              Function: {
                'Fn::GetAtt': [
                  'HelloWorldLambdaFunction',
                  'Arn'
                ]
              }
            }]
          }
        },
        DependsOn: [
          'HelloLambdaPermissionS3SampleBucketS3',
          'HelloWorldLambdaPermissionS3SampleBucketS3'
        ]
      }
      const actual = S3.replaceS3BucketFunctionWithAlias(s3Bucket, functionAlias, functionName)
      expect(actual).to.deep.equal(expected)
    })
  })
})
