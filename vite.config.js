import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseBundledSongCatalog } from './releaseAnnouncements.mjs';

function releaseCatalogManifestPlugin() {
  const createManifest = () => JSON.stringify({
    songs: parseBundledSongCatalog(readFileSync(new URL('./src/main.jsx', import.meta.url), 'utf8')),
  });
  return {
    name: 'deluxe-tunes-release-catalog',
    configureServer(server) {
      server.middlewares.use('/song-catalog.json', (req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(req.method === 'HEAD' ? undefined : createManifest());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'song-catalog.json', source: createManifest() });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), releaseCatalogManifestPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
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