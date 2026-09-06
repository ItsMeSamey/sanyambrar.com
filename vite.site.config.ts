import { defineConfig } from 'vite';
import solid from '@solidjs/vite-plugin';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  input: path.resolve(import.meta.dirname, 'src/site/main.tsx'),
  plugins: [solid()],
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/site-runtime'),
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
});
