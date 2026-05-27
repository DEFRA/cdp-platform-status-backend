import http from 'node:http'
import { config } from '#/config.js'
import { fetchWithClient, HTTP_CLIENTS } from './index.js'

describe('http-clients', () => {
  afterEach(() => {
    config.set('httpProxy', null)
    delete process.env.HTTP_PROXY
  })

  test('Should normalize undici response to fetch-like shape', async () => {
    fetchMock.mockResponseOnce('hello world', {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/plain' }
    })

    const response = await fetchWithClient(
      'undici',
      'https://example.com',
      { signal: AbortSignal.timeout(1000), redirect: 'manual' },
      1000
    )

    expect(response.ok).toBe(true)
    expect(response.status).toBe(200)
    expect(typeof response.statusText).toBe('string')
    expect(response.headers.get('content-type')).toContain('text/plain')
    await expect(response.text()).resolves.toBe('hello world')
  })

  test.each(HTTP_CLIENTS.filter((client) => client !== 'undici'))(
    'Should normalize %s response to fetch-like shape',
    async (client) => {
      const httpServer = http.createServer((_req, res) => {
        res.writeHead(200, {
          'content-type': 'text/plain',
          'x-test-client': 'yes'
        })
        res.end('hello world')
      })

      await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
      const address = httpServer.address()
      const port = typeof address === 'object' && address ? address.port : 0

      try {
        const response = await fetchWithClient(
          client,
          `http://127.0.0.1:${port}`,
          { signal: AbortSignal.timeout(1000), redirect: 'manual' },
          1000
        )

        expect(response.ok).toBe(true)
        expect(response.status).toBe(200)
        expect(typeof response.statusText).toBe('string')
        expect(response.headers.get('content-type')).toContain('text/plain')
        await expect(response.text()).resolves.toBe('hello world')
      } finally {
        await new Promise((resolve) => httpServer.close(() => resolve()))
      }
    }
  )

  test.each(HTTP_CLIENTS)(
    'Should bypass HTTP_PROXY when routing is direct',
    async (client) => {
      process.env.HTTP_PROXY = 'http://127.0.0.1:1'

      const httpServer = http.createServer((_req, res) => {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end('direct ok')
      })

      await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
      const address = httpServer.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const targetUrl = `http://127.0.0.1:${port}`

      if (client === 'undici') {
        fetchMock.disableMocks()
      }

      try {
        const response = await fetchWithClient(
          client,
          targetUrl,
          { signal: AbortSignal.timeout(1000), redirect: 'manual' },
          1000,
          'direct'
        )

        expect(response.ok).toBe(true)
        await expect(response.text()).resolves.toBe('direct ok')
      } finally {
        if (client === 'undici') {
          fetchMock.enableMocks()
        }
        await new Promise((resolve) => httpServer.close(() => resolve()))
      }
    }
  )
})
