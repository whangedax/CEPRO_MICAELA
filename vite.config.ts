import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const isInstitutional = mode === 'institutional';

  return {
    base: './',
    define: {
      '__IS_INSTITUTIONAL__': JSON.stringify(isInstitutional),
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      host: '127.0.0.1',
      watch: {
        ignored: ['**/release/**', '**/dev-sandbox/**', '**/sources/**', '**/docs/**', '**/tests/**', '**/capturas_**'],
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8085',
          changeOrigin: false,
          secure: false,
        },
      },
    },
    preview: {
      port: 5173,
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8085',
          changeOrigin: false,
          secure: false,
        },
      },
    },
  };
});
