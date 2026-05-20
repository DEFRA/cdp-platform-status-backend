const timeoutMs = 10000

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

async function runWithTimeout(taskFn) {
  return Promise.race([
    taskFn(),
    new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

async function checkMongo(request) {
  try {
    await runWithTimeout(() => request.db.command({ ping: 1 }))
    return { status: 'ok' }
  } catch (error) {
    request.logger.error({ err: error }, 'Mongo status check failed')
    return { status: 'fail', reason: normalizeError(error) }
  }
}

async function checkSquid(request) {
  try {
    const response = await fetch('https://www.gov.uk', {
      signal: AbortSignal.timeout(timeoutMs)
    })

    if (response.ok) {
      return { status: 'ok' }
    }

    return {
      status: 'fail',
      reason: `Unexpected response status ${response.status}`
    }
  } catch (error) {
    request.logger.error({ err: error }, 'Squid status check failed')
    return { status: 'fail', reason: normalizeError(error) }
  }
}

export const statusRoutes = [
  {
    method: 'GET',
    path: '/status/mongo',
    options: { auth: false },
    handler: async (request, h) => {
      const mongo = await checkMongo(request)
      return h.response({ checks: { mongo } })
    }
  },
  {
    method: 'GET',
    path: '/status/squid',
    options: { auth: false },
    handler: async (request, h) => {
      const squid = await checkSquid(request)
      return h.response({ checks: { squid } })
    }
  }
]
