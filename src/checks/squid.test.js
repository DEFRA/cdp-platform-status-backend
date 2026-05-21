import { vi } from 'vitest'
import { checkSquid } from './squid.js'

const request = { logger: { error: vi.fn() } }

describe('#checkSquid', () => {
  test('Should return ok with both operations ok when both fetches succeed', async () => {
    fetchMock.mockResponseOnce('', { status: 200 })
    fetchMock.mockResponseOnce('', { status: 200 })

    expect(await checkSquid(request)).toEqual({
      status: 'ok',
      operations: { default: 'ok', specific: 'ok' }
    })
  })

  test('Should return fail when default route returns non-ok status', async () => {
    fetchMock.mockResponseOnce('', { status: 503 })
    fetchMock.mockResponseOnce('', { status: 200 })

    expect(await checkSquid(request)).toEqual({
      status: 'fail',
      operations: { default: 'fail', specific: 'ok' }
    })
  })

  test('Should return fail when specific route returns non-ok status', async () => {
    fetchMock.mockResponseOnce('', { status: 200 })
    fetchMock.mockResponseOnce('', { status: 404 })

    expect(await checkSquid(request)).toEqual({
      status: 'fail',
      operations: { default: 'ok', specific: 'fail' }
    })
  })

  test('Should return fail when both fetches throw', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'))
    fetchMock.mockRejectOnce(new Error('Network error'))

    const result = await checkSquid(request)
    expect(result).toMatchObject({
      status: 'fail',
      operations: { default: expect.any(String), specific: expect.any(String) }
    })
  })

  test('Should log error with url when a fetch throws', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'))
    fetchMock.mockResponseOnce('', { status: 200 })

    await checkSquid(request)
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        url: 'https://www.gov.uk'
      }),
      'Squid default check failed'
    )
  })
})
