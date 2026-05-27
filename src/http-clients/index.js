import { undiciGet } from './undici.js'
import { nodeFetchGet } from './node-fetch.js'
import { axiosGet } from './axios.js'
import { wreckGet } from './wreck.js'

export const HTTP_CLIENTS = ['undici', 'node-fetch', 'axios', 'wreck']

function normalizeHeaders(headers) {
  return headers instanceof Headers ? headers : new Headers(headers)
}

function toFetchLikeResponse({ status, statusText, headers, bodyText }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: normalizeHeaders(headers),
    async text() {
      return bodyText
    }
  }
}

export async function fetchWithClient(
  client,
  url,
  options,
  timeoutMs,
  routing
) {
  if (client === 'node-fetch') {
    const res = await nodeFetchGet(url, options, timeoutMs, routing)
    const bodyText = await res.text()
    return toFetchLikeResponse({
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      bodyText
    })
  }

  if (client === 'axios') {
    const res = await axiosGet(url, options, timeoutMs, routing)
    return toFetchLikeResponse({
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      bodyText:
        typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
    })
  }

  if (client === 'wreck') {
    const { res, payload } = await wreckGet(url, options, timeoutMs, routing)
    return toFetchLikeResponse({
      status: res.statusCode ?? 0,
      statusText: res.statusMessage ?? '',
      headers: res.headers,
      bodyText: Buffer.isBuffer(payload)
        ? payload.toString('utf8')
        : String(payload ?? '')
    })
  }

  if (client === 'undici') {
    return undiciGet(url, options, timeoutMs, routing)
  }

  throw new Error(`Unknown HTTP client: ${client}`)
}
