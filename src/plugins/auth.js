import Basic from '@hapi/basic'

import { config } from '#/config.js'

const validate = async (_request, username, password) => {
  const validUsername = config.get('auth.username')
  const validPassword = config.get('auth.password')

  const isValid = username === validUsername && password === validPassword

  return { isValid, credentials: { username } }
}

export const auth = {
  plugin: {
    name: 'auth',
    register: async (server) => {
      await server.register(Basic)
      server.auth.strategy('basic', 'basic', { validate })
      server.auth.default('basic')
    }
  }
}
