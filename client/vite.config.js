import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()], // lets Vite understand JSX
  server: {
    // The backend only allows requests from http://localhost:5173 (CLIENT_URL in server/.env).
    // strictPort: if 5173 is busy, stop with an error instead of silently using another port,
    // which would make every API call fail with a confusing CORS error.
    port: 5173,
    strictPort: true,
  },
});
