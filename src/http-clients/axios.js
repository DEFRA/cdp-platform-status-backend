import axios from 'axios'
import { resolveHttpAgents } from './routing.js'

export function axiosGet(url, options, timeoutMs, routing) {
  const agents = resolveHttpAgents(routing)

  return axios({
    method: 'get',
    url,
    signal: options?.signal,
    timeout: timeoutMs,
    maxRedirects: 0,
    validateStatus: () => true,
    proxy: false,
    ...(agents ? { httpAgent: agents.http, httpsAgent: agents.https } : {})
  })
}
