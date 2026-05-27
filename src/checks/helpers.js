export const timeoutMs = 10000

export function normalizeError(error) {
  if (error instanceof Error) {
    return error.cause instanceof Error
      ? normalizeError(error.cause)
      : error.message
  }

  return String(error)
}

export async function runWithTimeout(taskFn) {
  return Promise.race([
    taskFn(),
    new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`Timed out after ${timeoutMs}ms`))
      }, timeoutMs)
    })
  ])
}

export function failWithReason(reason) {
  return { status: 'fail', reason }
}
