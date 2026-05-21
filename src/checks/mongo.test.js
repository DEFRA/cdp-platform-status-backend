import { vi } from 'vitest'
import { checkMongo } from './mongo.js'

function mockRequest(overrides = {}) {
  const collection = {
    insertOne: vi.fn().mockResolvedValue({}),
    findOne: vi.fn().mockResolvedValue({ _id: 'health-check' }),
    deleteOne: vi.fn().mockResolvedValue({}),
    ...overrides
  }
  return {
    db: {
      command: vi.fn().mockResolvedValue({ ok: 1 }),
      collection: vi.fn().mockReturnValue(collection)
    },
    logger: { error: vi.fn() }
  }
}

describe('#checkMongo', () => {
  test('Should return ok with all operations ok when everything succeeds', async () => {
    expect(await checkMongo(mockRequest())).toEqual({
      status: 'ok',
      operations: { connect: 'ok', insert: 'ok', find: 'ok', delete: 'ok' }
    })
  })

  test('Should return fail with connect fail when ping throws', async () => {
    const request = mockRequest()
    request.db.command = vi
      .fn()
      .mockRejectedValue(new Error('connection refused'))

    expect(await checkMongo(request)).toMatchObject({
      status: 'fail',
      reason: 'connection refused',
      operations: { connect: 'ok' }
    })
  })

  test('Should return fail with insert fail when insertOne throws', async () => {
    const result = await checkMongo(
      mockRequest({
        insertOne: vi.fn().mockRejectedValue(new Error('write failed'))
      })
    )

    expect(result).toEqual({
      status: 'fail',
      reason: 'write failed',
      operations: { connect: 'ok', insert: 'fail', find: 'ok', delete: 'ok' }
    })
  })

  test('Should return fail with find fail when findOne returns null', async () => {
    const result = await checkMongo(
      mockRequest({ findOne: vi.fn().mockResolvedValue(null) })
    )

    expect(result).toEqual({
      status: 'fail',
      reason: 'Inserted document not found',
      operations: { connect: 'ok', insert: 'ok', find: 'fail', delete: 'ok' }
    })
  })

  test('Should return fail with delete fail when deleteOne throws', async () => {
    const result = await checkMongo(
      mockRequest({
        deleteOne: vi.fn().mockRejectedValue(new Error('delete failed'))
      })
    )

    expect(result).toEqual({
      status: 'fail',
      reason: 'delete failed',
      operations: { connect: 'ok', insert: 'ok', find: 'ok', delete: 'fail' }
    })
  })

  test('Should log error on failure', async () => {
    const request = mockRequest({
      insertOne: vi.fn().mockRejectedValue(new Error('timeout'))
    })
    await checkMongo(request)
    expect(request.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Mongo status check failed'
    )
  })
})
