import { vi } from 'vitest'
import { checkS3 } from './s3.js'

function mockS3Send(overrides = {}) {
  return vi.fn().mockImplementation(async (cmd) => {
    const name = cmd.constructor.name
    if (overrides[name]) {
      return overrides[name]()
    }
    if (name === 'GetObjectCommand') {
      return { Body: { transformToString: vi.fn().mockResolvedValue('ok') } }
    }
    return {}
  })
}

function mockRequest(sendImpl) {
  return {
    s3: { send: sendImpl ?? mockS3Send() },
    logger: { error: vi.fn() }
  }
}

describe('#checkS3', () => {
  test('Should return ok with all operations when everything succeeds', async () => {
    expect(await checkS3(mockRequest())).toEqual({
      status: 'ok',
      operations: { list: 'ok', put: 'ok', get: 'ok', delete: 'ok' }
    })
  })

  test('Should return fail with list:fail when ListObjectsV2 throws', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AccessDenied'))
    )
    const result = await checkS3(request)
    expect(result).toEqual({
      status: 'fail',
      reason: 'AccessDenied',
      operations: { list: 'fail', put: 'fail', get: 'fail', delete: 'fail' }
    })
  })

  test('Should return fail with put:fail when PutObject throws', async () => {
    const request = mockRequest(
      mockS3Send({
        PutObjectCommand: () => {
          throw new Error('AccessDenied')
        }
      })
    )
    const result = await checkS3(request)
    expect(result).toMatchObject({
      status: 'fail',
      operations: { list: 'ok', put: 'fail', get: 'fail', delete: 'fail' }
    })
  })

  test('Should log error on failure', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AccessDenied'))
    )
    await checkS3(request)
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'S3 status check failed'
    )
  })
})
