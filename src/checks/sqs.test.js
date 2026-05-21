import { vi } from 'vitest'
import { checkSqs } from './sqs.js'

function mockSqsSend({ receiptHandle = 'test-handle' } = {}) {
  let callCount = 0
  return vi.fn().mockImplementation(async () => {
    callCount++
    if (callCount === 2) {
      return {
        Messages: receiptHandle ? [{ ReceiptHandle: receiptHandle }] : []
      }
    }
    return {}
  })
}

function mockRequest(sendImpl) {
  return {
    sqs: { send: sendImpl ?? mockSqsSend() },
    logger: { error: vi.fn() }
  }
}

describe('#checkSqs', () => {
  test('Should return ok with all operations when message is received and deleted', async () => {
    expect(await checkSqs(mockRequest())).toEqual({
      status: 'ok',
      operations: { send: 'ok', receive: 'ok', delete: 'ok' }
    })
  })

  test('Should return ok with delete:ok even when no message is received', async () => {
    const request = mockRequest(mockSqsSend({ receiptHandle: null }))
    expect(await checkSqs(request)).toEqual({
      status: 'ok',
      operations: { send: 'ok', receive: 'ok', delete: 'ok' }
    })
  })

  test('Should return fail with send:fail when SendMessage throws', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AccessDenied'))
    )
    expect(await checkSqs(request)).toEqual({
      status: 'fail',
      reason: 'AccessDenied',
      operations: { send: 'fail', receive: 'fail', delete: 'fail' }
    })
  })

  test('Should log error on failure', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AccessDenied'))
    )
    await checkSqs(request)
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'SQS status check failed'
    )
  })
})
