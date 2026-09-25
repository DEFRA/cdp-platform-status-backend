export const slowRequest = {
  method: 'GET',
  path: '/slow-request',
  options: {
    auth: false
  },
  handler: async (request, h) => {
    const seconds = Number(request.query.seconds ?? 60)

    await new Promise(resolve => setTimeout(resolve, seconds * 1000))

    return h.response({ message: 'success' })
  }
}
