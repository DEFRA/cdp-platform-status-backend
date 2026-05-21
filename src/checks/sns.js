import { PublishCommand } from '@aws-sdk/client-sns'
import { config } from '#/config.js'
import {
  normalizeError,
  runWithTimeout,
  failWithReason
} from '#/checks/helpers.js'

export async function checkSns(request) {
  const topicArn = config.get('aws.snsTopicArn')

  if (!topicArn) {
    return failWithReason('SNS_TOPIC_ARN is not configured')
  }

  const ops = { publish: 'fail' }

  try {
    await runWithTimeout(async () => {
      await request.sns.send(
        new PublishCommand({
          TopicArn: topicArn,
          Message: JSON.stringify({
            source: 'cdp-platform-status-check',
            timestamp: new Date().toISOString()
          }),
          Subject: 'platform-status-check'
        })
      )
      ops.publish = 'ok'
    })
    return { status: 'ok', operations: ops }
  } catch (error) {
    request.logger.error({ err: error }, 'SNS status check failed')
    return { status: 'fail', reason: normalizeError(error), operations: ops }
  }
}
