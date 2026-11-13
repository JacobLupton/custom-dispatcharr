import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const here = path.dirname(fileURLToPath(import.meta.url));
// Upstream Dispatcharr frontend. Never edited in this fork: we import its data
// layer (api, stores, websocket, utils) and selected components through
// src/core/upstream.js so upstream merges keep applying cleanly.
const UPSTREAM_ROOT = path.resolve(here, '../frontend');
const UPSTREAM_SRC = path.join(UPSTREAM_ROOT, 'src');
const LOCAL_ENTRY = path.join(here, 'src/main.jsx');

// Files under ../frontend import bare packages ('react', '@mantine/core', ...).
// Resolve those from *this* package's node_modules so there is exactly one
// copy of React/Mantine/zustand and ../frontend never needs `npm install`.
const resolveUpstreamDeps = () => ({
  name: 'resolve-upstream-deps',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (!importer || !importer.startsWith(UPSTREAM_ROOT)) return null;
    if (/^[./\0]/.test(source) || source.startsWith('@upstream')) return null;
    if (/^[a-zA-Z]:/.test(source)) return null;
    return this.resolve(source, LOCAL_ENTRY, { ...options, skipSelf: true });
  },
});

export default defineConfig({
  plugins: [resolveUpstreamDeps(), react()],
  resolve: {
    alias: {
      '@upstream': UPSTREAM_SRC,
      '@core': path.join(here, 'src/core'),
      '@modules': path.join(here, 'src/modules'),
    },
    dedupe: ['react', 'react-dom', '@mantine/core', '@mantine/hooks', 'zustand', 'react-router-dom'],
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 9191,
    fs: { allow: [here, UPSTREAM_ROOT] },
    proxy: {
      '/api': { target: 'http://127.0.0.1:5656', changeOrigin: true, secure: false },
      '/proxy': { target: 'http://127.0.0.1:5656', changeOrigin: true, secure: false },
      '/ws': { target: 'http://127.0.0.1:8001', changeOrigin: true, secure: false, ws: true },
    },
  },
});
