import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { VIT_CONNECT_API = 'http://127.0.0.1:5000' } = loadEnv(mode, process.cwd(), 'VIT_CONNECT_');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': VIT_CONNECT_API,
        '/uploads': VIT_CONNECT_API,
        '/socket.io': { target: VIT_CONNECT_API, ws: true },
      },
    },
  };
});
