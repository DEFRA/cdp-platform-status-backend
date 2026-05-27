import nodeFetch from 'node-fetch'
import { agentForUrl, resolveHttpAgents } from './routing.js'

export function nodeFetchGet(url, options, _timeoutMs, routing) {
  const agent = agentForUrl(url, resolveHttpAgents(routing))

  return nodeFetch(url, {
    ...options,
    ...(agent ? { agent } : {})
  })
}
