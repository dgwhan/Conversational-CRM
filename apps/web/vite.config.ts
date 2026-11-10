import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const apiProxy = {
  '/api': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    secure: false,
    ws: true,
    configure: (proxy: any) => {
      proxy.on('error', (err: any, _req: any, res: any) => {
        const isConnectionRefused =
          ('code' in err && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) ||
          (err.message && err.message.includes('ECONNREFUSED'));

        if (isConnectionRefused && res && 'writeHead' in res && !res.headersSent) {
          res.writeHead(503, {
            'Content-Type': 'application/json',
            'Retry-After': '10',
          });
          res.end(
            JSON.stringify({
              status: 'offline',
              message: 'Máy chủ Backend API (:3000) chưa khởi động. Vui lòng chạy "pnpm dev:api" hoặc "npm run start:dev".',
            })
          );
        }
      });
    },
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  preview: {
    port: 4173,
    proxy: apiProxy,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
});
