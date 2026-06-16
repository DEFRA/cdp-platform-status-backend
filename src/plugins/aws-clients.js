import { S3Client } from '@aws-sdk/client-s3'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SNSClient } from '@aws-sdk/client-sns'
import { config } from '#/config.js'

function createS3Client() {
  const region = config.get('aws.region')
  const endpoint = config.get('aws.endpoint')

  if (!endpoint) {
    return new S3Client({ region })
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: config.get('aws.s3ForcePathStyle')
  })
}

export const awsClients = {
  plugin: {
    name: 'aws-clients',
    version: '1.0.0',
    register(server) {
      const region = config.get('aws.region')
      const endpoint = config.get('aws.endpoint')

      if (endpoint) {
        server.logger.warn(
          {
            endpoint,
            forcePathStyle: config.get('aws.s3ForcePathStyle')
          },
          'S3 client using local AWS emulator endpoint (path-style URLs)'
        )
      }

      const s3 = createS3Client()
      const sqs = new SQSClient({ region })
      const sns = new SNSClient({ region })

      server.decorate('server', 's3', s3)
      server.decorate('server', 'sqs', sqs)
      server.decorate('server', 'sns', sns)
      server.decorate('request', 's3', () => s3, { apply: true })
      server.decorate('request', 'sqs', () => sqs, { apply: true })
      server.decorate('request', 'sns', () => sns, { apply: true })

      server.events.on('stop', () => {
        server.logger.info('Closing AWS SDK clients')
        s3.destroy()
        sqs.destroy()
        sns.destroy()
      })
    }
  }
}
