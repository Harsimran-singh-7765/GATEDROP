import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { VitePWA } from 'vite-plugin-pwa' // (Aapka PWA plugin)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // (Aapki PWA settings yahaan rahengi)
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Gatedrop',
        short_name: 'Gatedrop',
        description: 'Peer-to-peer campus delivery made simple.',
        theme_color: '#10B981',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // <-- PROXY WAALA SERVER BLOCK YAHAN SE HATA DIYA GAYA HAI -->
})