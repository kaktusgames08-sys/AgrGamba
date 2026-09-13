import { defineConfig } from 'vite';

// Relative base so the build works from any GitHub Pages path
// (https://user.github.io/repo-name/) without extra configuration.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
