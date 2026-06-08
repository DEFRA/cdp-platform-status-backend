import { setup, teardown } from 'vitest-mongodb'

beforeAll(async () => {
  // Setup mongo mock
  await setup({
    binary: {
      version: 'latest',
      downloadDir: './.cache/mongodb-binaries'
    },
    serverOptions: {},
    autoStart: false
  })
  process.env.MONGO_URI = globalThis.__MONGO_URI__
}, 120_000)

afterAll(async () => {
  await teardown()
})
