import { existsSync } from 'node:fs'
import path from 'node:path'
import solid from '@solidjs/vite-plugin'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const root = import.meta.dirname
const keybrRoot = path.resolve(root, 'src/games/keybr')
const target = process.env.SAMEY_VITE_BUILD ?? 'wordle'

const extensionlessHtmlPreview: Plugin = {
  name: 'samey-extensionless-html-preview',
  configurePreviewServer(server) {
    server.middlewares.use((request, _response, next) => {
      const raw = request.url
      if (!raw) return next()
      const url = new URL(raw, 'http://samey.local')
      const pathname = decodeURIComponent(url.pathname)
      if (pathname !== '/' && !pathname.endsWith('/') && !path.extname(pathname)) {
        const outDir = path.resolve(root, server.config.build.outDir)
        const htmlFile = path.resolve(outDir, '.' + pathname + '.html')
        if (htmlFile.startsWith(outDir + path.sep) && existsSync(htmlFile))
          request.url = pathname + '.html' + url.search
      }
      next()
    })
  },
}

export default defineConfig(() => {
  if (target === 'wordle') return {
    publicDir: false,
    input: path.resolve(root, 'src/games/wordle/index.html'),
    plugins: [solid(), viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: path.resolve(root, '.build/wordle'),
      rolldownOptions: { checks: { pluginTimings: false } },
    },
  }

  if (target === 'site') return {
    publicDir: false,
    input: path.resolve(root, 'src/site/main.tsx'),
    plugins: [extensionlessHtmlPreview, solid()],
    build: {
      outDir: path.resolve(root, '.build/site-runtime'),
      emptyOutDir: true,
      target: 'es2022',
      manifest: true,
      cssCodeSplit: true,
      rolldownOptions: {
        output: {
          entryFileNames: 'site-chunks/site-app-[hash].js',
          chunkFileNames: 'site-chunks/[name]-[hash].js',
          assetFileNames: 'site-chunks/[name]-[hash][extname]',
        },
      },
    },
  }

  if (target === 'site-prerender') return {
    publicDir: false,
    plugins: [solid({ ssr: true })],
    build: {
      outDir: path.resolve(root, '.build/site-prerender'),
      emptyOutDir: true,
      target: 'es2022',
      ssr: path.resolve(root, 'src/site/prerender.tsx'),
      rolldownOptions: {
        output: {
          entryFileNames: 'prerender.js',
          chunkFileNames: 'prerender-chunks/[name]-[hash].js',
        },
      },
    },
  }

  if (target === 'blog') return {
    publicDir: false,
    input: path.resolve(root, 'src/blogs/btop-mutex.html'),
    plugins: [solid(), viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: path.resolve(root, '.build/blog-post'),
      emptyOutDir: true,
      target: 'es2022',
    },
  }

  if (target === 'shared') return {
    publicDir: false,
    build: {
      outDir: path.resolve(root, '.build/shared-runtime'),
      emptyOutDir: true,
      target: 'es2022',
      minify: false,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve(root, 'src/shared/runtime.ts'),
        name: 'SameySharedRuntime',
        formats: ['iife'],
        fileName: () => 'shared-runtime.js',
      },
      rolldownOptions: {
        output: {
          assetFileNames: asset => asset.name?.endsWith('.css') ? 'site.css' : '[name]-[hash][extname]',
        },
      },
    },
  }

  if (target === 'keybr') return {
    root: keybrRoot,
    base: './',
    assetsInclude: ['**/*.data'],
    plugins: [solid()],
    css: { modules: { localsConvention: 'camelCase' } },
    build: {
      outDir: path.resolve(root, '.build/keybr'),
      emptyOutDir: true,
      target: 'es2022',
      manifest: true,
      cssMinify: 'lightningcss',
      minify: 'oxc',
      assetsDir: 'keybr-assets',
      assetsInlineLimit: 0,
      rolldownOptions: {
        preserveEntrySignatures: 'allow-extension',
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              { name: 'vendor', test: /node_modules/, minSize: 20_000, maxSize: 180_000, priority: 10 },
              { name: 'keybr', test: /src[\\/][^\\/]+[\\/]/, minSize: 40_000, maxSize: 180_000, includeDependenciesRecursively: false, priority: 5 },
            ],
          },
        },
      },
    },
  }

  throw new Error(`Unknown SAMEY_VITE_BUILD target: ${target}`)
})
