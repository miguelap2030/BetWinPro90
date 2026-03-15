import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook para verificar si el usuario actual es administrador
 * @returns {Object} { isAdmin, loading, error, refreshAdminStatus }
 */
export function useAdminRole() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const checkAdminStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      // Verificar si es admin usando la función SQL
      const { data, error: rpcError } = await supabase.rpc('is_user_admin')
      
      if (rpcError) {
        console.error('Error al verificar rol de admin:', rpcError)
        setIsAdmin(false)
        setError(rpcError.message)
      } else {
        setIsAdmin(data || false)
      }
    } catch (err) {
      console.error('Error en useAdminRole:', err)
      setError(err.message)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAdminStatus()

    // Escuchar cambios en autenticación
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

  return {
    isAdmin,
    loading,
    error,
    refreshAdminStatus: checkAdminStatus
  }
}

/**
 * Hook para obtener estadísticas del dashboard de admin
 * @returns {Object} { stats, loading, error, refreshStats }
 */
export function useAdminDashboardStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats')
      
      if (rpcError) throw rpcError
      
      setStats(data?.[0] || null)
    } catch (err) {
      console.error('Error al obtener estadísticas:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats
  }
}
