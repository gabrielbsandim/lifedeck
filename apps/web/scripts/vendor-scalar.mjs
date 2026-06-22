import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const entry = require.resolve('@scalar/api-reference')
const distDir = dirname(entry)
const source = join(distDir, 'browser')
const destination = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'public',
  'scalar',
)

rmSync(destination, { recursive: true, force: true })
mkdirSync(destination, { recursive: true })
cpSync(source, destination, { recursive: true })

process.stdout.write(`Vendored Scalar API reference into ${destination}\n`)
