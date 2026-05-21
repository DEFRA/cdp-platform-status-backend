import { S3Client } from '@aws-sdk/client-s3'
import { SQSClient } from '@aws-sdk/client-sqs'
import { SNSClient } from '@aws-sdk/client-sns'

function withOptionalEndpoint(region, endpoint) {
  if (!endpoint) {
    return { region }
  }

  return { region, endpoint }
}

export const awsClients = {
  plugin: {
    name: 'aws-clients',
    version: '1.0.0',
    register(server, options) {
      const { region, s3Endpoint, sqsEndpoint, snsEndpoint } = options

      const s3 = new S3Client(withOptionalEndpoint(region, s3Endpoint))
      const sqs = new SQSClient(withOptionalEndpoint(region, sqsEndpoint))
      const sns = new SNSClient(withOptionalEndpoint(region, snsEndpoint))

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
