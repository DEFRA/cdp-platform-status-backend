import { normalizeError, runWithTimeout } from '#/checks/helpers.js'

export async function checkMongo(request) {
  const ops = { connect: 'ok', insert: 'ok', find: 'ok', delete: 'ok' }
  const collection = request.db.collection('platform-status-health-check')

  try {
    await runWithTimeout(async () => {
      await request.db.command({ ping: 1 })

      ops.insert = 'pending'
      await collection.insertOne({ _id: 'health-check', ts: new Date() })
      ops.insert = 'ok'

      ops.find = 'pending'
      const found = await collection.findOne({ _id: 'health-check' })
      if (!found) {
        throw new Error('Inserted document not found')
      }
      ops.find = 'ok'

      ops.delete = 'pending'
      await collection.deleteOne({ _id: 'health-check' })
      ops.delete = 'ok'
    })
    return { status: 'ok', operations: ops }
  } catch (error) {
    request.logger.error({ err: error }, 'Mongo status check failed')
    const failedOp = Object.keys(ops).find((k) => ops[k] === 'pending')
    if (failedOp) {
      ops[failedOp] = 'fail'
    }
    return { status: 'fail', reason: normalizeError(error), operations: ops }
  }
}
