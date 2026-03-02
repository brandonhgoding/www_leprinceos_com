import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Widget build config: produces a single self-contained JS file
// that cinemas drop on their websites.
// Build command: npx vite build --config vite.config.widget.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/embed',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/widget/main.tsx',
      output: {
        // Single file output
        entryFileNames: 'widget.js',
        // Inline all chunks to produce one file
        manualChunks: undefined,
      },
    },
    // Inline CSS into the JS bundle (shadow DOM injects it)
    cssCodeSplit: false,
    // Target modern browsers
    target: 'es2020',
    // Minify for production
    minify: 'esbuild',
  },
  // Dev server config for testing the widget locally
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
