import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CheckCircle, XCircle, Clock, DollarSign, MessageSquare, Hash } from 'lucide-react'

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [notes, setNotes] = useState({})

  const fetchDeposits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_deposits_pending')
      
      if (error) throw error
      
      setDeposits(data || [])
    } catch (error) {
      console.error('Error al obtener depósitos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [])

  const processDeposit = async (depositId, status) => {
    try {
      setProcessingId(depositId)
      
      const adminNotes = notes[depositId] || ''
      
      const { data, error } = await supabase.rpc('admin_process_deposit', {
        p_deposit_id: depositId,
        p_status: status,
        p_admin_notes: adminNotes
      })
      
      if (error) throw error
      
      const result = data?.[0]
      
      if (result?.success) {
        alert(result.message)
        setNotes(prev => ({ ...prev, [depositId]: '' }))
        fetchDeposits()
      } else {
        alert(result?.message || 'Error al procesar depósito')
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
        <p className="text-gray-400">Cargando depósitos pendientes...</p>
      </div>
    )
  }

  if (deposits.length === 0) {
    return (
      <div className="glass-card p-12 rounded-2xl text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">¡Todo al día!</h3>
        <p className="text-gray-400">No hay depósitos pendientes de aprobación</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Depósitos Pendientes</h3>
            <p className="text-gray-400 text-sm">{deposits.length} depósitos esperando aprobación</p>
          </div>
        </div>
      </div>

      {/* Lista de depósitos */}
      <div className="grid gap-4">
        {deposits.map((deposit) => (
          <div
            key={deposit.deposit_id}
            className="glass-card p-6 rounded-2xl hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Información del usuario */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {deposit.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{deposit.username}</h4>
                  <p className="text-gray-400 text-sm">{deposit.email}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(deposit.created_at).toLocaleString('es-ES')}
                  </p>
                </div>
              </div>

              {/* Monto */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-green-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-2xl font-bold text-green-400">
                      ${deposit.amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Método de pago */}
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Método</p>
                    <p className="text-white font-medium capitalize">{deposit.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Hash Transacción</p>
                    <div className="flex items-center gap-1 text-gray-300 text-sm">
                      <Hash className="w-3 h-3" />
                      <span className="truncate" title={deposit.transaction_hash}>
                        {deposit.transaction_hash ? 
                          `${deposit.transaction_hash.substring(0, 8)}...${deposit.transaction_hash.substring(deposit.transaction_hash.length - 4)}` : 'N/A'}
                      </span>
                    </div>
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
                  value={notes[deposit.deposit_id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [deposit.deposit_id]: e.target.value }))}
                  placeholder="Agregar nota sobre esta decisión..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => processDeposit(deposit.deposit_id, 'approved')}
                  disabled={processingId === deposit.deposit_id}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <CheckCircle className="w-5 h-5" />
                  {processingId === deposit.deposit_id ? 'Procesando...' : 'Aprobar Depósito'}
                </button>
                
                <button
                  onClick={() => processDeposit(deposit.deposit_id, 'rejected')}
                  disabled={processingId === deposit.deposit_id}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  <XCircle className="w-5 h-5" />
                  {processingId === deposit.deposit_id ? 'Procesando...' : 'Rechazar Depósito'}
                </button>
              </div>

              {/* Notas anteriores */}
              {deposit.notes && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Historial:</p>
                  <p className="text-gray-300 text-sm">{deposit.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
