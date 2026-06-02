import { config } from '#/config.js'

export const sts = {
  method: 'GET',
  path: '/sts',
  options: {
    auth: config.get('auth.jwt.enabled') ? 'jwt' : false
  },
  handler: (request, h) =>
    h.response({
      isAuthenticated: request.auth.isAuthenticated,
      strategy: request.auth.strategy,
      credentials: request.auth.credentials,
      message: 'success'
    })
}
