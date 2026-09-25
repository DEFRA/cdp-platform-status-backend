export const timeoutTest = {
  method: 'GET',
  path: '/timeout-test',
  options: {
    auth: false
  },
  handler: async (_request, h) => {
    await new Promise(resolve => setTimeout(resolve, 60000))

    return h.response({ message: 'success' })
  }
}
