import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중 /api 요청을 로컬 백엔드로 전달 (CORS 없이 사용)
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
