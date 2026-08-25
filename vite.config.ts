import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import path from 'path'
import { Plugin } from 'vite'
import * as fs from 'fs'

function vitePluginAppcache(options: {
  fileName?: string; // Customize the manifest file name (default: 'appcache.manifest')
} = {}): Plugin {
  const fileName = options.fileName || 'appcache.manifest'

  return {
    name: 'vite-plugin-appcache',
    writeBundle: async (outputOptions) => {
      const outputPath = path.resolve(outputOptions.dir || 'dist', fileName); // Default to 'dist' if outputOptions.dir is not defined

      try {
        fs.writeFileSync(outputPath, `CACHE MANIFEST
# Timestamp: ${new Date().getTime()}

CACHE:
index.html

NETWORK:
*
`)
        console.log(`AppCache manifest file '${fileName}' generated at: ${outputPath}`)
      } catch (error) {
        console.error(`Error generating AppCache manifest file:`, error)
      }
    },
  }
}

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
    vitePluginAppcache(),
  ],

  resolve: {
    alias: {
      '~': path.resolve(__dirname, './submodules/solid-ui/apps/docs/src/'),
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

