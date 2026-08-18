import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'legacy-html-redirects',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/cart.html' || req.url?.startsWith('/cart.html?')) {
            res.writeHead(302, { Location: '/cart' });
            res.end();
            return;
          }
          if (req.url === '/admin.html' || req.url?.startsWith('/admin.html?')) {
            res.writeHead(302, { Location: '/admin' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
