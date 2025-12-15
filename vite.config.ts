import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Get base path from environment variable or default to repository name
// For GitHub Pages, this should be set to '/<repository-name>/'
const base = process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/mediguard-dashboard/' : '/');

export default defineConfig({
  base,
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
