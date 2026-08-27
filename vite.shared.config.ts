import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/shared-runtime'),
    emptyOutDir: true,
    target: 'es2022',
    minify: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/shared/runtime.ts'),
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
});
