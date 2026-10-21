import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Fixed ports so this project doesn't clash with other local dev servers.
  server: { port: 6123 },
  preview: { port: 6123 },
  // Phaser alone is ~1.2 MB minified; warn only above that.
  build: { chunkSizeWarningLimit: 1500 },
});
