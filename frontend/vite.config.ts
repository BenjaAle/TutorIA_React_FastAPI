import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Añadí server para poder hacer proxy al backend y evitar problemas de CORS
  // para no escribir la ruta completa en los fetch
  server: { 
    proxy: {
      // Todo lo que empiece por /api, /chats, etc. va al backend
      '/api': 'http://127.0.0.1:8000',
      '/chats': 'http://127.0.0.1:8000',
      '/chat': 'http://127.0.0.1:8000',
      '/crear_chat': 'http://127.0.0.1:8000',
      '/proponer_cartas': 'http://127.0.0.1:8000',
      '/inyectar_cartas': 'http://127.0.0.1:8000',
      '/generar_historia': 'http://127.0.0.1:8000',
      '/proponer_carta_unica': 'http://127.0.0.1:8000',
      // Los audios estáticos también se piden al backend
      '/static': 'http://127.0.0.1:8000'
    }
  }
})
