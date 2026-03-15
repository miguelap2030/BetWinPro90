import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

/**
 * Componente para proteger rutas que requieren rol de administrador
 * Verifica que el usuario esté autenticado Y tenga rol de admin
 * 
 * Uso:
 * <AdminRoute>
 *   <AdminDashboard />
 * </AdminRoute>
 */
export default function AdminRoute({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAdminStatus()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAdminStatus()
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAdminStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar sesión
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('Error al obtener sesión:', sessionError)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      if (!session) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      // Verificar si es admin usando la función SQL
      const { data, error: rpcError } = await supabase.rpc('is_user_admin')

      if (rpcError) {
        console.error('Error al verificar rol de admin:', rpcError)
        // Si hay error en la función RPC, verificamos manualmente el rol
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setIsAdmin(profileData?.role === 'admin')
      } else {
        setIsAdmin(data || false)
      }
    } catch (err) {
      console.error('Error en AdminRoute:', err)
      setError(err.message)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Verificando permisos de administrador...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error de permisos</div>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="gradient-btn px-6 py-2 rounded-xl"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    // Si no es admin, redirigir al dashboard principal
    return <Navigate to="/dashboard/principal" replace />
  }

  return children
}
