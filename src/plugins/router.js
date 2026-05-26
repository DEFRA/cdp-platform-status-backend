import { health } from '#/routes/health.js'
import { logs } from '#/routes/logs.js'
import { killRoutes } from '#/routes/kill.js'
import { networkRoutes } from '#/routes/network.js'
import { statusRoutes } from '#/routes/status.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route(
        [health].concat(statusRoutes, logs, networkRoutes, killRoutes(server))
      )
    }
  }
}
