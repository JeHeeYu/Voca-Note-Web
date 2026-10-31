import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/firestore')) return 'firebase-firestore'
          if (id.includes('node_modules/@firebase/auth')) return 'firebase-auth'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router'))
            return 'react-vendor'
        },
      },
    },
  },
})
