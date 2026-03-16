import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno según el modo (development, production)
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
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
    // Asegurar que las variables de entorno estén disponibles durante el build
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_SUPABASE_URL),
    },
  }
})
