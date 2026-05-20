import neostandard from 'neostandard'

export default neostandard({
  env: ['node', 'vitest'],
  globals: {
    fetchMock: 'readonly'
  },
  ignores: [...neostandard.resolveIgnoresFromGitignore()],
  noJsx: true,
  noStyle: true
})
