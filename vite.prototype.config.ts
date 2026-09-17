import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Separate artifact: never replaces the production application's entry point.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist-prototype', rollupOptions: { input: 'prototype.html' } },
});
