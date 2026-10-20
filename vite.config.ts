import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Phaser alone is ~1.2 MB minified; warn only above that.
  build: { chunkSizeWarningLimit: 1500 },
});
