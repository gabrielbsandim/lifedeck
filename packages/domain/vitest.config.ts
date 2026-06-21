import { defineConfig } from 'vitest/config'
import { createVitestConfig } from '@taskin/config/vitest/base'

export default defineConfig(createVitestConfig({ environment: 'node' }))
