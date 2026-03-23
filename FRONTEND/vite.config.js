import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server:{
    proxy: {
      '/api':'https://aqma-queue-management-1.onrender.com',
    },
    // Configure CORS for WebSocket connections
    cors: true,
  },
  plugins: [react()],

})
