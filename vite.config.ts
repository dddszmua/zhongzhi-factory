import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 默认对接线上；本地联调时在 .env.development 覆盖为 127.0.0.1
  const apiTarget = env.VITE_DEV_API_PROXY || 'https://fdueblab.cn'
  const agentTarget = env.VITE_DEV_AGENT_PROXY || 'https://fdueblab.cn'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api/agent': {
          target: agentTarget,
          changeOrigin: true,
          secure: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
