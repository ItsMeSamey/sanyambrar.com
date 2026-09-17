import path from 'node:path'
import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const root = import.meta.dirname
const keybrRoot = path.resolve(root, 'src/games/keybr')
const target = process.env.SAMEY_VITE_BUILD ?? 'wordle'

export default defineConfig(({ mode }) => {
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
    plugins: [solid()],
    build: {
      outDir: path.resolve(root, '.build/site-runtime'),
      emptyOutDir: true,
      target: 'es2022',
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
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    css: { modules: { localsConvention: 'camelCase' } },
    build: {
      outDir: path.resolve(root, '.build/keybr'),
      emptyOutDir: true,
      target: 'es2022',
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
