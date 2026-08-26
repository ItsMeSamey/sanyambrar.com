import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  plugins: [solid()],
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/site-runtime'),
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'src/site/main.tsx'),
      output: {
        entryFileNames: 'site-app.js',
        chunkFileNames: 'site-chunks/[name]-[hash].js',
        assetFileNames: asset => asset.name?.endsWith('.css') ? 'site-chunks/[name]-[hash][extname]' : 'site-chunks/[name]-[hash][extname]',
      },
    },
  },
});
