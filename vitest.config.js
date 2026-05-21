import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    fileParallelism: false,
    env: {
      ADMIN_PASSWORD: 'test-password',
      S3_BUCKET: 'test-bucket',
      SQS_QUEUE_URL: 'https://sqs.eu-west-2.amazonaws.com/123456789012/test',
      SNS_TOPIC_ARN: 'arn:aws:sns:eu-west-2:123456789012:test-topic'
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [...configDefaults.exclude, 'coverage']
    },
    setupFiles: ['.vite/mongo-memory-server.js', '.vite/setup-files.js']
  }
})
