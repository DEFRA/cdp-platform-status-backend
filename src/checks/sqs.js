import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} from '@aws-sdk/client-sqs'
import { config } from '#/config.js'
import {
  normalizeError,
  runWithTimeout,
  failWithReason
} from '#/checks/helpers.js'

export async function checkSqs(request) {
  const queueUrl = config.get('aws.sqsQueueUrl')

  if (!queueUrl) {
    return failWithReason('SQS_QUEUE_URL is not configured')
  }

  const ops = { send: 'fail', receive: 'fail', delete: 'fail' }

  try {
    await runWithTimeout(async () => {
      await request.sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({
            source: 'cdp-platform-status-check',
            timestamp: new Date().toISOString()
          })
        })
      )
      ops.send = 'ok'

      const received = await request.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 2
        })
      )
      ops.receive = 'ok'

      const receiptHandle = received.Messages?.[0]?.ReceiptHandle
      if (receiptHandle) {
        await request.sqs.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle
          })
        )
      }
      ops.delete = 'ok'
    })
    return { status: 'ok', operations: ops }
  } catch (error) {
    request.logger.error({ err: error }, 'SQS status check failed')
    return { status: 'fail', reason: normalizeError(error), operations: ops }
  }
}
