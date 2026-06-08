import { MongoMemoryReplSet } from 'mongodb-memory-server'

let mongod

export async function setup() {
  mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  })
  process.env.MONGO_URI = mongod.getUri()
}

export async function teardown() {
  if (mongod) {
    await mongod.stop()
  }
}
