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
    if (server) {
      await server.stop({ timeout: 0 })
    }
  })

  describe('GET /status/mongo', () => {
    test('Should return ok with granular operation results when everything succeeds', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/mongo'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          mongo: {
            status: 'ok',
            operations: {
              connect: 'ok',
              insert: 'ok',
              find: 'ok',
              delete: 'ok'
            }
          }
        }
      })
    })

    test('Should return fail when mongo insert throws', async () => {
      vi.spyOn(server.db, 'collection').mockReturnValueOnce({
        insertOne: vi.fn().mockRejectedValue(new Error('connection timed out')),
        findOne: vi.fn(),
        deleteOne: vi.fn()
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/mongo'
      })

      expect(statusCode).toBe(200)
      expect(result).toMatchObject({
        checks: { mongo: { status: 'fail', reason: 'connection timed out' } }
      })
    })
  })

  describe('GET /status/squid', () => {
    test('Should return ok with both operations when both routes succeed', async () => {
      fetchMock.mockResponseOnce('', { status: 200 })
      fetchMock.mockResponseOnce('', { status: 200 })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/squid'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          squid: {
            status: 'ok',
            operations: { default: 'ok', specific: 'ok' }
          }
        }
      })
    })

    test('Should return fail when a route check fails', async () => {
      fetchMock.mockResponseOnce('', { status: 503 })
      fetchMock.mockResponseOnce('', { status: 200 })

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

  describe('GET /status/s3', () => {
    test('Should return ok with all operations when S3 check succeeds', async () => {
      vi.spyOn(server.s3, 'send').mockImplementation(async (cmd) => {
        if (cmd.constructor.name === 'GetObjectCommand') {
          return {
            Body: { transformToString: vi.fn().mockResolvedValue('ok') }
          }
        }
        return {}
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/s3'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          s3: {
            status: 'ok',
            operations: { list: 'ok', put: 'ok', get: 'ok', delete: 'ok' }
          }
        }
      })
    })
  })

  describe('GET /status/sqs', () => {
    test('Should return ok with all operations when SQS check succeeds', async () => {
      let sqsCallCount = 0
      vi.spyOn(server.sqs, 'send').mockImplementation(async () => {
        sqsCallCount++
        if (sqsCallCount === 2) {
          return { Messages: [{ ReceiptHandle: 'test-handle' }] }
        }
        return {}
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/sqs'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          sqs: {
            status: 'ok',
            operations: { send: 'ok', receive: 'ok', delete: 'ok' }
          }
        }
      })
    })
  })

  describe('GET /status/sns', () => {
    test('Should return ok with publish:ok when SNS check succeeds', async () => {
      vi.spyOn(server.sns, 'send').mockResolvedValueOnce({})

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/status/sns'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        checks: {
          sns: {
            status: 'ok',
            operations: { publish: 'ok' }
          }
        }
      })
    })
  })
})
