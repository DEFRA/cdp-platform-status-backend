import { vi } from 'vitest'
import { checkSns } from './sns.js'

function mockRequest(sendImpl = vi.fn().mockResolvedValue({})) {
  return {
    sns: { send: sendImpl },
    logger: { error: vi.fn() }
  }
}

describe('#checkSns', () => {
  test('Should return ok with publish:ok when Publish succeeds', async () => {
    expect(await checkSns(mockRequest())).toEqual({
      status: 'ok',
      operations: { publish: 'ok' }
    })
  })

  test('Should return fail with publish:fail when Publish throws', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AuthorizationError'))
    )
    expect(await checkSns(request)).toEqual({
      status: 'fail',
      reason: 'AuthorizationError',
      operations: { publish: 'fail' }
    })
  })

  test('Should log error on failure', async () => {
    const request = mockRequest(
      vi.fn().mockRejectedValue(new Error('AuthorizationError'))
    )
    await checkSns(request)
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'SNS status check failed'
    )
  })
})
