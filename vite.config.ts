import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import { rename, rm } from 'node:fs/promises'

export default defineConfig({
  publicDir: false,
  plugins: [
    solid(),
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: 'app-output-name',
      async closeBundle() {
        const app=path.resolve(import.meta.dirname,'docs/app.html'),wordle=path.resolve(import.meta.dirname,'docs/wordle.html')
        await rm(wordle,{force:true});await rename(app,wordle)
      },
    },
  ],
  resolve: { alias: { '~': path.resolve(import.meta.dirname, './src/ui-kit/') } },
  build: {
    outDir: 'docs',
    emptyOutDir: false,
    rollupOptions: {
      input:path.resolve(import.meta.dirname,'app.html'),
      checks: { pluginTimings: false },
    },
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: true,
      format: { comments: false, preserve_annotations: false },
      enclose: true,
      keep_classnames: false,
      keep_fnames: false,
      ie8: false,
      mangle: true,
    },
  },
})
