import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from "vite-plugin-static-copy"

// https://vite.dev/config/
export default defineConfig(() =>{

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/onnxruntime-web/dist/*.wasm",
            dest: "",
          },
        ],
      }),
    ],
    resolve: {
      alias: {
        "@": '/src',
        "svg": '/src/assets/svg',
      }
    },
    optimizeDeps: {
      exclude: ['@mediapipe/pose'],
      exclude: ['@mediapipe/camera_utils'],
    },
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  }
})
