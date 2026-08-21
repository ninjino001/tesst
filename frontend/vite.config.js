import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

  return defineConfig({
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      open: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // Ensure cookies returned by the backend are rewritten so the browser accepts them
          // (backend may set Domain=backend which is not valid for the host browser).
          cookieDomainRewrite: {
            '*': ''
          },
        },
      },
    },
  })
}
