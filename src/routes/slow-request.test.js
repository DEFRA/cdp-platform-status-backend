import { describe, expect, it, vi } from 'vitest'
import { slowRequest } from './slow-request.js'

describe('#slowRequest', () => {
  it('delays the response by the requested number of seconds', async () => {
    vi.useFakeTimers()

    const request = {
      query: {
        seconds: 5
      }
    }

    const h = {
      response: vi.fn()
    }

    const promise = slowRequest.handler(request, h)

    expect(h.response).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(4999)

    expect(h.response).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await promise

    expect(h.response).toHaveBeenCalledWith({
      message: 'success'
    })

    vi.useRealTimers()
  })
})
