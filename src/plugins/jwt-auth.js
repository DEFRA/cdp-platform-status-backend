import Boom from '@hapi/boom'
import { jwtVerify, createRemoteJWKSet, customFetch } from 'jose'
import { ProxyAgent } from 'undici'
import { config } from '#/config.js'
import * as undici from 'undici'

const jwtScheme = () => ({
  authenticate: async (request, h) => {
    const auth = request.headers.authorization
    const audience = config.get('auth.jwt.audience')
    const issuer = config.get('auth.jwt.issuer')

    if (!auth?.startsWith('Bearer ')) {
      throw Boom.unauthorized(null, 'Bearer')
    }

    const token = auth.slice('Bearer '.length)

    try {
      const { payload, protectedHeader } = await jwtVerify(
        token,
        request.server.app.JWKS,
        {
          issuer,
          audience,
          algorithms: ['RS256']
        }
      )

      return h.authenticated({
        credentials: {
          token: payload,
          tags: payload['https://sts.amazonaws.com/']?.principal_tags,
          sub: payload.sub
        },
        artifacts: {
          protectedHeader,
          payload
        }
      })
    } catch (err) {
      console.log(err)
      throw Boom.unauthorized('Invalid token', 'Bearer')
    }
  }
})

export const jwtAuth = {
  plugin: {
    name: 'jwt',
    register: async (server) => {
      const issuer = config.get('auth.jwt.issuer')
      if (!issuer) {
        server.logger.warn('AUTH_JWT_ISSUER is not set, JWT auth is disabled')
        return
      }

      const jwksUri = new URL('/.well-known/jwks.json', issuer)

      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

      server.app.JWKS = createRemoteJWKSet(jwksUri, {
        [customFetch]: (...args) => {
          return undici.fetch(args[0], { ...args[1], dispatcher }) // prettier-ignore
        }
      })

      server.auth.scheme('jwt-proxy', jwtScheme)
      server.auth.strategy('jwt', 'jwt-proxy')
    }
  }
}
