import { resolve4, resolve6 } from 'node:dns/promises'
import net from 'node:net'
import Joi from 'joi'
import { normalizeError, runWithTimeout, timeoutMs } from '#/checks/helpers.js'

const maxResponseBodyChars = 1024 * 1024

function checkTcpPort(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()

    socket.setTimeout(timeoutMs)

    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })

    socket.on('timeout', () => {
      socket.destroy()
      reject(
        new Error(
          `Connection to ${host}:${port} timed out after ${timeoutMs}ms`
        )
      )
    })

    socket.connect(port, host)
  })
}

export const networkRoutes = [
  {
    method: 'POST',
    path: '/network/check',
    options: {
      validate: {
        payload: Joi.object({
          url: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .required()
        })
      }
    },
    handler: async (request, h) => {
      const { url } = request.payload

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(timeoutMs),
          redirect: 'manual'
        })

        const squidBlocked = response.status === 307
        const text = squidBlocked ? '' : await response.text()
        const truncated = !squidBlocked && text.length > maxResponseBodyChars
        const body = truncated ? text.slice(0, maxResponseBodyChars) : text

        return h.response({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          squidBlocked,
          headers: Object.fromEntries(response.headers.entries()),
          body,
          truncated
        })
      } catch (error) {
        request.logger.error({ err: error, url }, 'Network check failed')
        return h.response({
          ok: false,
          error: normalizeError(error)
        })
      }
    }
  },
  {
    method: 'POST',
    path: '/network/dns',
    options: {
      validate: {
        payload: Joi.object({
          hostname: Joi.string().hostname().required()
        })
      }
    },
    handler: async (request, h) => {
      const { hostname } = request.payload

      const [ipv4Result, ipv6Result] = await Promise.allSettled([
        runWithTimeout(() => resolve4(hostname)),
        runWithTimeout(() => resolve6(hostname))
      ])

      const ipv4 = ipv4Result.status === 'fulfilled' ? ipv4Result.value : []
      const ipv6 = ipv6Result.status === 'fulfilled' ? ipv6Result.value : []

      if (ipv4.length === 0 && ipv6.length === 0) {
        const errors = [ipv4Result, ipv6Result]
          .filter((r) => r.status === 'rejected')
          .map((r) => normalizeError(r.reason))
        const error = errors.length ? errors.join('; ') : 'No records found'
        return h.response({ ok: false, hostname, ipv4, ipv6, error })
      }

      return h.response({ ok: true, hostname, ipv4, ipv6 })
    }
  },
  {
    method: 'POST',
    path: '/network/port',
    options: {
      validate: {
        payload: Joi.object({
          host: Joi.string().required(),
          port: Joi.number().integer().min(1).max(65535).required()
        })
      }
    },
    handler: async (request, h) => {
      const { host, port } = request.payload

      try {
        await checkTcpPort(host, port)
        return h.response({ ok: true, host, port, reachable: true })
      } catch (error) {
        request.logger.error({ err: error, host, port }, 'Port check failed')
        return h.response({
          ok: false,
          host,
          port,
          reachable: false,
          error: normalizeError(error)
        })
      }
    }
  }
]
