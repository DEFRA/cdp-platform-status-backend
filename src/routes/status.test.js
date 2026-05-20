import { vi } from 'vitest'

describe('#statusRoutes', () => {
  let server

  beforeAll(async () => {
    // Dynamic import required because vitest-mongodb updates MONGO_URI before tests run
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /status/mongo', () => {
    test('Should return ok when mongo ping succeeds', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/mongo'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({ checks: { mongo: { status: 'ok' } } })
    })

    test('Should return fail when mongo ping throws', async () => {
      vi.spyOn(server.db, 'command').mockRejectedValueOnce(
        new Error('connection timed out')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/mongo'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: { mongo: { status: 'fail', reason: 'connection timed out' } }
      })
    })
  })

  describe('GET /status/squid', () => {
    test('Should return ok when proxy fetch succeeds', async () => {
      fetchMock.mockResponseOnce('', { status: 200 })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/squid'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({ checks: { squid: { status: 'ok' } } })
    })

    test('Should return fail when proxy returns non-ok status', async () => {
      fetchMock.mockResponseOnce('', { status: 503 })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/squid'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          squid: { status: 'fail', reason: 'Unexpected response status 503' }
        }
      })
    })

    test('Should return fail when proxy fetch throws', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'))

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/squid'
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        checks: { squid: { status: 'fail' } }
      })
    })
  })
})
