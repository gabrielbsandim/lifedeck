import base from '@taskin/config/eslint/react'

export default [
  ...base,
  {
    ignores: ['.next/**'],
  },
]
