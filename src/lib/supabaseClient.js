import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY?.trim()

// Validación estricta de variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = '⚠️ ERROR: Faltan variables de entorno de Supabase. ' +
    'Verifica que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén configuradas en Netlify.'
  console.error(errorMsg)
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ configurada' : '❌ faltante')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ configurada' : '❌ faltante')
  
  // Lanzar error en producción para fallo temprano
  if (import.meta.env.PROD) {
    throw new Error(errorMsg)
  }
}

// Cliente normal para operaciones del usuario (respeta RLS)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Cliente con service role para operaciones administrativas (ignora RLS)
// Usar solo en funciones administrativas específicas
export const supabaseAdmin = supabaseServiceRoleKey && supabaseUrl
  ? createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null
