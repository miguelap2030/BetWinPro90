import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Search, Filter, Edit2, ToggleLeft, ToggleRight, Shield, UserX, UserCheck } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState(null) // null, true, false
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * limit
      
      const { data, error } = await supabase.rpc('get_all_users_paginated', {
        p_limit: limit,
        p_offset: offset,
        p_search: searchTerm,
        p_filter_active: filterActive
      })
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setUsers(data)
        setTotalCount(data[0].total_count || 0)
      } else {
        setUsers([])
        setTotalCount(0)
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1)
      fetchUsers()
    }, 500)
    
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, filterActive])

  useEffect(() => {
    fetchUsers()
  }, [currentPage])

  // Actualizar rol de usuario
  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        p_user_id: userId,
        p_role: newRole
      })
      
      if (error) throw error
      
      if (data?.[0]?.success) {
        alert(data[0].message)
        fetchUsers()
      } else {
        alert(data?.[0]?.message || 'Error al actualizar rol')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  // Activar/Desactivar usuario
  const handleToggleActive = async (userId, currentStatus) => {
    try {
      const { data, error } = await supabase.rpc('admin_toggle_user_active', {
        p_user_id: userId,
        p_is_active: !currentStatus
      })
      
      if (error) throw error
      
      if (data?.[0]?.success) {
        alert(data[0].message)
        fetchUsers()
      } else {
        alert(data?.[0]?.message || 'Error al actualizar estado')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y filtros */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Búsqueda */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por username o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* Filtro */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => setFilterActive(e.target.value === 'all' ? null : e.target.value === 'active')}
              className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
        </div>
        
        {/* Contador */}
        <div className="mt-4 text-gray-400 text-sm">
          Mostrando {users.length} de {totalCount} usuarios
        </div>
      </div>

      {/* Tabla de usuarios */}
      {loading ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <p className="text-gray-400">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Balances</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.username}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(user.created_at).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.user_id, e.target.value)}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="user">Usuario</option>
                        <option value="moderator">Moderador</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(user.user_id, user.is_active)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          user.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Activo
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1 text-sm">
                        <div className="text-gray-400">
                          Inv: <span className="text-white font-medium">${(user.balance_invertido || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-gray-400">
                          Disp: <span className="text-green-400 font-medium">${(user.balance_disponible || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-gray-400">
                          Ret: <span className="text-pink-400 font-medium">${(user.total_retirado || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(user.user_id, user.is_active)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title={user.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {user.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-red-400" />
                          )}
                        </button>
                        <button
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Editar rol"
                        >
                          <Edit2 className="w-5 h-5 text-purple-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Anterior
          </button>
          
          <span className="px-4 py-2 text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
