import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckCircle, XCircle, Clock, DollarSign, MessageSquare } from 'lucide-react'

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [notes, setNotes] = useState({})

  const fetchWithdrawals = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_withdrawals_pending')
      
      if (error) throw error
      
      setWithdrawals(data || [])
    } catch (error) {
      console.error('Error al obtener retiros:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWithdrawals()
  }, [])

  const processWithdrawal = async (withdrawalId, status) => {
    try {
      setProcessingId(withdrawalId)
      
      const adminNotes = notes[withdrawalId] || ''
      
      const { data, error } = await supabase.rpc('admin_process_withdrawal', {
        p_withdrawal_id: withdrawalId,
        p_status: status,
        p_admin_notes: adminNotes
      })
      
      if (error) throw error
      
      const result = data?.[0]
      
      if (result?.success) {
        alert(result.message)
        setNotes(prev => ({ ...prev, [withdrawalId]: '' }))
        fetchWithdrawals()
      } else {
        alert(result?.message || 'Error al procesar retiro')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center">
        <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Cargando retiros pendientes...</p>
      </div>
    )
  }

  if (withdrawals.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">¡Todo al día!</h3>
        <p className="text-gray-400">No hay retiros pendientes de aprobación</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Retiros Pendientes</h3>
            <p className="text-gray-400 text-sm">{withdrawals.length} retiros esperando aprobación</p>
          </div>
        </div>
      </div>

      {/* Lista de retiros */}
      <div className="grid gap-4">
        {withdrawals.map((withdrawal) => (
          <div
            key={withdrawal.withdrawal_id}
            className="glass-card p-6 rounded-2xl hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Información del usuario */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {withdrawal.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{withdrawal.username}</h4>
                  <p className="text-gray-400 text-sm">{withdrawal.email}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(withdrawal.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>

              {/* Monto */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-green-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-2xl font-bold text-green-400">
                      ${withdrawal.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Método</p>
                    <p className="text-white font-medium capitalize">{withdrawal.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Dirección/Cuenta</p>
                    <p className="text-gray-300 text-sm truncate" title={withdrawal.payment_address}>
                      {withdrawal.payment_address ? 
                        `${withdrawal.payment_address.substring(0, 20)}...` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas y acciones */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              {/* Notas del admin */}
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Notas (opcional)
                </label>
                <textarea
                  value={notes[withdrawal.withdrawal_id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [withdrawal.withdrawal_id]: e.target.value }))}
                  placeholder="Agregar nota sobre esta decisión..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => processWithdrawal(withdrawal.withdrawal_id, 'approved')}
                  disabled={processingId === withdrawal.withdrawal_id}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <CheckCircle className="w-5 h-5" />
                  {processingId === withdrawal.withdrawal_id ? 'Procesando...' : 'Aprobar Retiro'}
                </button>
                
                <button
                  onClick={() => processWithdrawal(withdrawal.withdrawal_id, 'rejected')}
                  disabled={processingId === withdrawal.withdrawal_id}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <XCircle className="w-5 h-5" />
                  {processingId === withdrawal.withdrawal_id ? 'Procesando...' : 'Rechazar Retiro'}
                </button>
              </div>

              {/* Notas anteriores */}
              {withdrawal.notes && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Historial:</p>
                  <p className="text-gray-300 text-sm">{withdrawal.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
