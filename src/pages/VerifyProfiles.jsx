import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Users, UserCheck, AlertCircle } from 'lucide-react'

export default function VerifyProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          referral_code,
          sponsor_id,
          is_active,
          created_at,
          sponsor:profiles2!inner(
            id,
            username,
            referral_code
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setProfiles(data || [])
    } catch (err) {
      console.error('Error loading profiles:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadProfilesSimple = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setProfiles(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading profiles:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            Verificación de Perfiles y Sistema MLM
          </h1>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Error al cargar</p>
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={loadProfilesSimple}
                  className="mt-2 text-sm text-purple-400 hover:underline"
                >
                  Intentar carga simple
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={loadProfiles}
              className="gradient-btn mr-4"
              disabled={loading}
            >
              Recargar Perfiles
            </button>
            <button
              onClick={loadProfilesSimple}
              className="glass-btn"
              disabled={loading}
            >
              Carga Simple
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-300">Cargando perfiles...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Username</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Referral Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Sponsor ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Sponsor</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Estado</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-gray-700 hover:bg-purple-900/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-purple-500" />
                          <span className="font-medium">{profile.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{profile.email}</td>
                      <td className="py-3 px-4">
                        <code className="bg-purple-100 px-2 py-1 rounded text-sm text-purple-300">
                          {profile.referral_code}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        {profile.sponsor_id ? (
                          <code className="bg-green-100 px-2 py-1 rounded text-xs text-green-300">
                            {profile.sponsor_id.substring(0, 8)}...
                          </code>
                        ) : (
                          <span className="text-gray-400 text-sm">Sin sponsor</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {profile.sponsor && profile.sponsor.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-green-500" />
                            <span className="text-green-300 font-medium">
                              {profile.sponsor[0]?.username || 'N/A'}
                            </span>
                          </div>
                        ) : profile.sponsor_id ? (
                          <span className="text-orange-400 text-sm">Sponsor existe pero no se pudo cargar</span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          profile.is_active !== false
                            ? 'bg-green-100 text-green-300'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {profile.is_active !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(profile.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {profiles.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay perfiles registrados</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-900/30 rounded-lg border border-blue-700">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Verificación del Sistema MLM</h3>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• <strong>Sponsor ID:</strong> Debe mostrar un UUID cuando hay referido</li>
              <li>• <strong>Sponsor:</strong> Debe mostrar el username de quien refirió</li>
              <li>• <strong>Referral Code:</strong> Cada usuario debe tener uno único</li>
              <li>• <strong>Estado:</strong> Debe decir "Activo" para usuarios activos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
