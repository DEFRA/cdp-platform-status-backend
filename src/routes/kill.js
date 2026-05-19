import Joi from 'joi'
import { createLogger } from '#/common/helpers/logging/logger.js'

const logger = createLogger()

function triggerOutOfMemory() {
  const leaks = []
  let totalMb = 0

  const interval = setInterval(() => {
    // Allocate on the V8 heap (not native memory) so the heap limit is hit
    leaks.push(new Array(1024 * 1024 * 25).fill('x'))
    totalMb += 100
    logger.warn(
      {
        totalMb,
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      'OOM: allocated memory chunk'
    )
  }, 100)

  setTimeout(() => {
    clearInterval(interval)
  }, 30000)
}

export function killRoutes(server) {
  return [
    {
      method: 'POST',
      path: '/kill',
      options: {
        validate: {
          payload: Joi.object({
            type: Joi.string()
              .valid('exit', 'sigterm', 'oom', 'health')
              .default('exit')
          })
        }
      },
      handler: async (request, h) => {
        const { type } = request.payload
        request.logger.warn({ killType: type }, 'Kill triggered')

        setImmediate(() => {
          if (type === 'exit') {
            process.exit(1)
          } else if (type === 'sigterm') {
            process.emit('SIGTERM')
          } else if (type === 'oom') {
            triggerOutOfMemory()
          } else if (type === 'health') {
            server.listener.close()
          }
        })

        return h.response({ triggered: type }).code(200)
      }
    }
  ]
}
