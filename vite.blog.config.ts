import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { ViteMinifyPlugin } from 'vite-plugin-minify';
import path from 'node:path';

export default defineConfig({
  publicDir: false,
  plugins: [
    viteSingleFile({ removeViteModuleLoader: true }),
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
  build: {
    outDir: path.resolve(import.meta.dirname, '.build/blog-post'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: { input: path.resolve(import.meta.dirname, 'src/blog/btop-mutex.html') },
  },
});
