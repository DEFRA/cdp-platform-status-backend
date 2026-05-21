import { checkMongo } from '#/checks/mongo.js'
import { checkSquid } from '#/checks/squid.js'
import { checkS3 } from '#/checks/s3.js'
import { checkSqs } from '#/checks/sqs.js'
import { checkSns } from '#/checks/sns.js'

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
  },
  {
    method: 'GET',
    path: '/status/s3',
    options: { auth: false },
    handler: async (request, h) => {
      const s3 = await checkS3(request)
      return h.response({ checks: { s3 } })
    }
  },
  {
    method: 'GET',
    path: '/status/sqs',
    options: { auth: false },
    handler: async (request, h) => {
      const sqs = await checkSqs(request)
      return h.response({ checks: { sqs } })
    }
  },
  {
    method: 'GET',
    path: '/status/sns',
    options: { auth: false },
    handler: async (request, h) => {
      const sns = await checkSns(request)
      return h.response({ checks: { sns } })
    }
  }
]
