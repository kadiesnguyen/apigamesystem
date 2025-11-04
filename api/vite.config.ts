import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');   // lấy biến từ .env
  const API = env.VITE_API_URL;

  return defineConfig({
    plugins: [react(), tsconfigPaths()],
    server: {
      proxy: {
        '/api': {
          target: API,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  });
};
