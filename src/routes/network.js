import { resolve4, resolve6 } from 'node:dns/promises'
import net from 'node:net'
import Joi from 'joi'
import { normalizeError, runWithTimeout, timeoutMs } from '#/checks/helpers.js'
import { HTTP_CLIENTS, fetchWithClient } from '#/http-clients/index.js'

const maxResponseBodyChars = 1024 * 1024

// AWS EC2 instance metadata / credential endpoints — block to prevent SSRF
const BLOCKED_HOSTS = new Set([
  '169.254.169.254', // IMDSv1 / IMDSv2
  'fd00:ec2::254' // IPv6 IMDS
])

function isBlockedHost(host) {
  return BLOCKED_HOSTS.has(host.toLowerCase().replace(/^\[|\]$/g, ''))
}

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
            .required(),
          client: Joi.string()
            .valid(...HTTP_CLIENTS)
            .default('undici'),
          routing: Joi.string().valid('proxy', 'direct').optional()
        })
      }
    },
    handler: async (request, h) => {
      const { url, client, routing } = request.payload
      const start = performance.now()

      const parsedHost = new URL(url).hostname
      if (isBlockedHost(parsedHost)) {
        return h
          .response({
            ok: false,
            client,
            routing,
            error: `${parsedHost} is a blocked endpoint`,
            durationMs: 0
          })
          .code(400)
      }

      request.logger.info(
        {
          url,
          client,
          routing: routing ?? 'default',
          env: {
            HTTP_PROXY: process.env.HTTP_PROXY ?? null,
            HTTPS_PROXY: process.env.HTTPS_PROXY ?? null,
            NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY ?? null
          }
        },
        'Network check started'
      )

      try {
        const response = await fetchWithClient(
          client,
          url,
          {
            signal: AbortSignal.timeout(timeoutMs),
            redirect: 'manual'
          },
          timeoutMs,
          routing
        )

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
          truncated,
          client,
          routing,
          bodyLimitKb: truncated
            ? Math.round(maxResponseBodyChars / 1024)
            : undefined,
          durationMs: Math.round(performance.now() - start)
        })
      } catch (error) {
        // Squid returns 403 on CONNECT for HTTPS URLs not in the ACL —
        // undici throws this as an error rather than returning a response
        const squidBlocked =
          error instanceof Error &&
          error.message.includes('Proxy response (403)')

        request.logger.error({ err: error, url }, 'Network check failed')
        return h.response({
          ok: false,
          client,
          routing,
          squidBlocked,
          error: normalizeError(error),
          durationMs: Math.round(performance.now() - start)
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
      const start = performance.now()

      const [ipv4Result, ipv6Result] = await Promise.allSettled([
        runWithTimeout(() => resolve4(hostname)),
        runWithTimeout(() => resolve6(hostname))
      ])
      const durationMs = Math.round(performance.now() - start)

      const ipv4 = ipv4Result.status === 'fulfilled' ? ipv4Result.value : []
      const ipv6 = ipv6Result.status === 'fulfilled' ? ipv6Result.value : []

      if (ipv4.length === 0 && ipv6.length === 0) {
        const errors = [ipv4Result, ipv6Result]
          .filter((r) => r.status === 'rejected')
          .map((r) => normalizeError(r.reason))
        const error = errors.length ? errors.join('; ') : 'No records found'
        return h.response({
          ok: false,
          hostname,
          ipv4,
          ipv6,
          error,
          durationMs
        })
      }

      return h.response({ ok: true, hostname, ipv4, ipv6, durationMs })
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
      const start = performance.now()

      if (isBlockedHost(host)) {
        return h
          .response({
            ok: false,
            host,
            port,
            reachable: false,
            error: `${host} is a blocked endpoint`,
            durationMs: 0
          })
          .code(400)
      }

      try {
        await checkTcpPort(host, port)
        return h.response({
          ok: true,
          host,
          port,
          reachable: true,
          durationMs: Math.round(performance.now() - start)
        })
      } catch (error) {
        request.logger.error({ err: error, host, port }, 'Port check failed')
        return h.response({
          ok: false,
          host,
          port,
          reachable: false,
          error: normalizeError(error),
          durationMs: Math.round(performance.now() - start)
        })
      }
    }
  }
]
