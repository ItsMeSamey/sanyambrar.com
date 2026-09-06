import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import solid from '@solidjs/vite-plugin';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  input: path.resolve(import.meta.dirname, 'src/blogs/btop-mutex.html'),
  plugins: [solid(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/blog-post'),
    emptyOutDir: true,
    target: 'es2022',
  },
});
