import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import path from 'path'

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    viteSingleFile({
      removeViteModuleLoader: true
    }),
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

  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './src/ui-kit/'),
    }
  },

  build: {
    minify: 'terser',
    cssMinify: true,
    terserOptions: {
      compress: true,
      format: {
        comments: false,
        preserve_annotations: false,
      },
      enclose: true,
      keep_classnames: false,
      keep_fnames: false,
      ie8: false,
      mangle: true,
    },
  },
})

