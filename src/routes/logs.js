import Joi from 'joi'
import { audit } from '@defra/cdp-auditing'

export const logs = [
  {
    method: 'POST',
    path: '/logs',
    options: {
      validate: {
        payload: Joi.object({
          size: Joi.number().integer().min(1).max(1024).default(100),
          fill: Joi.string().min(1).max(1).default('A'),
          count: Joi.number().integer().min(1).max(1000).default(1),
          type: Joi.string().valid('log', 'audit').default('log')
        })
      }
    },
    handler: async (request, h) => {
      const { size, fill, count, type } = request.payload
      const sizeInBytes = 1024 * size
      const message = Buffer.alloc(sizeInBytes, fill).toString()

      for (let i = 0; i < count; i++) {
        if (type === 'audit') {
          audit({ index: i + 1, total: count }, message)
        } else {
          request.logger.info({ index: i + 1, total: count }, message)
        }
      }

      return h
        .response({
          generated: count,
          sizeKb: size,
          sizeBytes: message.length,
          fill,
          type
        })
        .code(200)
    }
  }
]
