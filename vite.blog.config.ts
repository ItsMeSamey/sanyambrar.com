import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import solid from 'vite-plugin-solid';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  plugins: [
    solid(),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/blog-post'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: { input: path.resolve(import.meta.dirname, 'src/blog/btop-mutex.html') },
  },
});
