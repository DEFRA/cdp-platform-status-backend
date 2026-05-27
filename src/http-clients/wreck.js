import Wreck from '@hapi/wreck'
import { agentForUrl, resolveHttpAgents } from './routing.js'

export function wreckGet(url, _options, timeoutMs, routing) {
  const agent = agentForUrl(url, resolveHttpAgents(routing))

  return Wreck.get(url, {
    timeout: timeoutMs,
    ...(agent ? { agent } : {})
  })
}
