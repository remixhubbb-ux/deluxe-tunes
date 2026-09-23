import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/android.incomplete-backup/**', '**/public/audio/**']
    },
    allowedHosts: ['defensive-uncouple-target.ngrok-free.dev', 'localhost'],
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
});