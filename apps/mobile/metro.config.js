// Metro config for the pnpm monorepo: watch the workspace root so `@lifedeck/*`
// packages resolve, and wrap with NativeWind so Tailwind classes compile.
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// Hierarchical lookup stays ON. The usual monorepo advice is to disable it, but
// that assumes a hoisted (npm/yarn) layout where every package is reachable
// from the two roots above. pnpm nests each package's own dependencies under
// `.pnpm/<pkg>/node_modules`, so a transitive import — expo-router →
// @expo/metro-runtime → whatwg-fetch — only resolves if Metro is allowed to
// walk up from the importing file.

module.exports = withNativeWind(config, { input: './src/global.css' })
