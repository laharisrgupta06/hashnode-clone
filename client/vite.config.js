import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // lets Vite understand JSX
  // Pre-bundle the Markdown packages when the dev server starts. They are only imported by a lazily
  // loaded component, so otherwise Vite would discover and re-bundle them on first use, which
  // changes their version hashes and breaks imports in tabs that were already open.
  optimizeDeps: {
    include: ['react-markdown', 'react-syntax-highlighter', 'react-syntax-highlighter/dist/esm/languages/prism/*', 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'],
  },
  server: {
    // The backend only allows requests from http://localhost:5173 (CLIENT_URL in server/.env).
    // strictPort: if 5173 is busy, stop with an error instead of silently using another port,
    // which would make every API call fail with a confusing CORS error.
    port: 5173,
    strictPort: true,
  },
  // Settings for `npm test` (Vitest). The build and dev server ignore this section.
  test: {
    environment: 'jsdom', // a simulated browser (DOM, localStorage) so React components can render
    setupFiles: './src/test/setup.js',
    // A fixed, fake API address: tests never use client/.env and never reach a real server.
    env: { VITE_API_URL: 'http://api.test/api' },
    restoreMocks: true, // every spy is undone after each test
  },
});
