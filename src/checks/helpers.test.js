import { runWithTimeout } from './helpers.js'

describe('#runWithTimeout', () => {
  test('Should resolve when task completes in time', async () => {
    await expect(runWithTimeout(() => Promise.resolve('ok'))).resolves.toBe(
      'ok'
    )
  })

  test('Should reject when task throws', async () => {
    await expect(
      runWithTimeout(() => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom')
  })
})
