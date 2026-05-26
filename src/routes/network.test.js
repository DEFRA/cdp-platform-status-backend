import { vi } from 'vitest'

vi.mock('node:dns/promises', () => ({
  resolve4: vi.fn().mockResolvedValue(['1.2.3.4', '5.6.7.8']),
  resolve6: vi.fn().mockResolvedValue(['::1'])
}))

describe('#networkRoutes', () => {
  let server
  const authHeader = `Basic ${Buffer.from('admin:test-password').toString('base64')}`

  beforeAll(async () => {
    // Dynamic import required because vitest-mongodb updates MONGO_URI before tests run
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('POST /network/check', () => {
    test('Should return response details when network check succeeds', async () => {
      fetchMock.mockResponseOnce('hello world', {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' }
      })

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/network/check',
        payload: { url: 'https://www.gov.uk' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        ok: true,
        status: 200,
        statusText: 'OK',
        squidBlocked: false,
        body: 'hello world',
        truncated: false
      })
    })

    test('Should detect squidBlocked and skip body when response is 307', async () => {
      fetchMock.mockResponseOnce('', {
        status: 307,
        statusText: 'Temporary Redirect',
        headers: { location: 'http://squid-error-page' }
      })

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/network/check',
        payload: { url: 'https://not-in-acl.example.com' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        ok: false,
        status: 307,
        squidBlocked: true,
        body: ''
      })
    })

    test('Should return 400 when url is invalid', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/network/check',
        payload: { url: 'definitely-not-a-url' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(400)
    })

    test('Should return ok:false when fetch fails', async () => {
      fetchMock.mockRejectOnce(new Error('connect ECONNREFUSED'))

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/network/check',
        payload: { url: 'https://example.com' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        ok: false,
        error: 'connect ECONNREFUSED'
      })
    })
  })

  describe('POST /network/dns', () => {
    test('Should return resolved addresses when DNS lookup succeeds', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/network/dns',
        payload: { hostname: 'www.gov.uk' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        ok: expect.any(Boolean),
        hostname: 'www.gov.uk',
        ipv4: expect.any(Array),
        ipv6: expect.any(Array)
      })
    })

    test('Should return 400 when hostname is invalid', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/network/dns',
        payload: { hostname: 'not a valid hostname!!!' },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(400)
    })
  })

  describe('POST /network/port', () => {
    test('Should return 400 when port is out of range', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/network/port',
        payload: { host: 'example.com', port: 99999 },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(400)
    })

    test('Should return 400 when host is missing', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/network/port',
        payload: { port: 443 },
        headers: { Authorization: authHeader }
      })

      expect(statusCode).toBe(400)
    })
  })
})
