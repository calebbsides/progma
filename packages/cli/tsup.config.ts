import { defineConfig } from 'tsup'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const clientBundle = readFileSync(
  path.resolve(__dirname, '../client/dist/client.js'),
  'utf8',
)

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  bundle: true,
  sourcemap: true,
  clean: true,
  dts: false,
  noExternal: [/@progma\/.*/],
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildPlugins: [
    {
      name: 'inline-client-bundle',
      setup(build) {
        build.onResolve({ filter: /^virtual:client-bundle$/ }, () => ({
          path: 'virtual:client-bundle',
          namespace: 'inline-client',
        }))
        build.onLoad({ filter: /.*/, namespace: 'inline-client' }, () => ({
          contents: `export default ${JSON.stringify(clientBundle)}`,
          loader: 'js',
        }))
      },
    },
  ],
})
