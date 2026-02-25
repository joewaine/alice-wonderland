import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for GitHub Pages deployment
  base: '/alice-wonderland/',
  // Enable top-level await for Rapier.js initialization
  esbuild: {
    target: 'es2022'
  },
  build: {
    target: 'es2022'
  },
  // Better error display during dev
  server: {
    open: true
  }
});
