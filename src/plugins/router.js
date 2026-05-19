import { health } from '#/routes/health.js'
import { logs } from '#/routes/logs.js'
import { killRoutes } from '#/routes/kill.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([health].concat(logs, killRoutes(server)))
    }
  }
}
