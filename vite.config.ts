import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

export default defineConfig({
  publicDir: false,
  input: path.resolve(import.meta.dirname, 'app.html'),
  plugins: [solid(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { alias: { '~': path.resolve(import.meta.dirname, './src/ui-kit/') } },
  build: {
    outDir: '.build/wordle',
    rolldownOptions: { checks: { pluginTimings: false } },
  },
})
