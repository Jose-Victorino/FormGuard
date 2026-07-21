import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// https://vite.dev/config/
export default defineConfig(() =>{

  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": '/src',
        "svg": '/src/assets/svg',
      }
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  }
})
