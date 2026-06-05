import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  outExtension: () => ({ js: '.js' }),
  format: ['iife'],
  globalName: '__progma',
  platform: 'browser',
  target: 'es2022',
  bundle: true,
  minify: false,
  sourcemap: true,
  clean: true,
  dts: false,
  esbuildOptions(options) {
    options.outdir = undefined
    options.outfile = 'dist/client.js'
  },
})
