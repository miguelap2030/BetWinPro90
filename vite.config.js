import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Asegura compatibilidad con Netlify
    outDir: 'dist',
    emptyOutDir: true,
    // Sourcemaps para debugging en producción (opcional)
    sourcemap: false,
    // Minificación
    minify: 'esbuild',
  },
  server: {
    // Configuración para desarrollo local
    port: 5173,
    host: true,
  },
})
