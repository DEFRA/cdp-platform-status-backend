import { resolveUndiciDispatcher } from './routing.js'

export function undiciGet(url, options, _timeoutMs, routing) {
  const dispatcher = resolveUndiciDispatcher(routing)

  return fetch(url, {
    ...options,
    ...(dispatcher ? { dispatcher } : {})
  })
}
