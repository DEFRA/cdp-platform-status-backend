import {
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { config } from '#/config.js'
import {
  normalizeError,
  runWithTimeout,
  failWithReason
} from '#/checks/helpers.js'

export async function checkS3(request) {
  const bucket = config.get('aws.s3Bucket')

  if (!bucket) {
    return failWithReason('S3_BUCKET is not configured')
  }

  const testKey = `platform-status-check/${Date.now()}`
  const ops = { list: 'fail', put: 'fail', get: 'fail', delete: 'fail' }

  try {
    await runWithTimeout(async () => {
      await request.s3.send(
        new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 })
      )
      ops.list = 'ok'

      await request.s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: testKey, Body: 'ok' })
      )
      ops.put = 'ok'

      const getResult = await request.s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: testKey })
      )
      await getResult.Body.transformToString()
      ops.get = 'ok'

      await request.s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: testKey })
      )
      ops.delete = 'ok'
    })
    return { status: 'ok', operations: ops }
  } catch (error) {
    request.logger.error({ err: error }, 'S3 status check failed')
    try {
      await request.s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: testKey })
      )
    } catch {}
    return { status: 'fail', reason: normalizeError(error), operations: ops }
  }
}
