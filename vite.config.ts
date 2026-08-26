import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import path from 'node:path'
import { rename, rm } from 'node:fs/promises'

export default defineConfig({
  publicDir: false,
  plugins: [
    solid(),
    tailwindcss(),
    viteSingleFile({ removeViteModuleLoader: true }),
    {
      name: 'app-output-name',
      async closeBundle() {
        const app=path.resolve(import.meta.dirname,'docs/app.html'),wordle=path.resolve(import.meta.dirname,'docs/wordle.html')
        await rm(wordle,{force:true});await rename(app,wordle)
      },
    },
    ViteMinifyPlugin({
      collapseBooleanAttributes: true,
      collapseInlineTagWhitespace: true,
      collapseWhitespace: true,
      decodeEntities: true,
      keepClosingSlash: true,
      minifyCSS: true,
      minifyJS: true,
      sortAttributes: true,
      sortClassName: true,
      useShortDoctype: true,
    }),
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
