import { timeoutMs, normalizeError } from '#/checks/helpers.js'

async function probeUrl(url, request, label) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs)
    })

    if (response.ok) {
      return 'ok'
    }

    request.logger.error(
      { url },
      `Squid ${label} check returned status ${response.status}`
    )
    return 'fail'
  } catch (error) {
    request.logger.error({ err: error, url }, `Squid ${label} check failed`)
    return normalizeError(error)
  }
}

export async function checkSquid(request) {
  const ops = {
    default: await probeUrl('https://www.gov.uk', request, 'default'),
    specific: await probeUrl('https://api.os.uk', request, 'specific')
  }

  const allOk = Object.values(ops).every((s) => s === 'ok')
  return { status: allOk ? 'ok' : 'fail', operations: ops }
}
