import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { ArrowDownToLine, DollarSign, Wallet, CheckCircle, AlertCircle } from 'lucide-react'
import { useProfile, useSignOut } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'

export default function Depositar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)

  const { data: profileData } = useProfile(user?.id)
  const signOutMutation = useSignOut()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profileData) setProfile(profileData)
  }, [profileData])

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/signin')
        return
      }
      setUser(session.user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(profileData)

      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      setWallet(walletData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setProcessing(true)

    try {
      // 1. Crear transacción de depósito directamente
      const { error: transactionError } = await supabase.rpc('create_transaction', {
        p_user_id: user.id,
        p_type: 'deposit',
        p_amount: parseFloat(amount),
        p_description: `Depósito de $${parseFloat(amount).toFixed(2)}`,
        p_status: 'completed',
        p_reference: 'deposito_simulado'
      })

      if (transactionError) throw transactionError

      // 2. Actualizar wallet - sumar al saldo invertido (para pruebas)
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance_invertido: (wallet?.balance_invertido || 0) + parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (walletError) throw walletError

      // 3. Invalidar caché para actualizar UI
      queryClient.invalidateQueries({ queryKey: ['wallet', user.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] })

      alert(`✅ Depósito de $${parseFloat(amount).toFixed(2)} completado exitosamente`)
      navigate('/dashboard/panel')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar depósito: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />

      <main className="lg:ml-0 p-3 pt-20 pb-24">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-1">
              Depositar Fondos
            </h1>
            <p className="text-xs text-gray-400">Agrega saldo a tu cuenta invertida (PRUEBAS)</p>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 mb-4 shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs opacity-90">Saldo Invertido</p>
              <DollarSign size={16} className="opacity-75" />
            </div>
            <p className="text-3xl font-bold">${wallet?.balance_invertido?.toFixed(2) || '0.00'}</p>
          </div>

          {/* Info Card */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-white" size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-200 text-sm mb-1">Depósito Simulado - PRUEBAS</h3>
                <p className="text-xs text-gray-400">
                  El saldo se acreditará inmediatamente a tu cuenta INVERTIDA para generar ganancias del 3% diario.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Monto a Depositar (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-3 border-2 border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 text-lg font-bold"
                    step="0.01"
                    min="0.5"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Mínimo: $0.50</p>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAmount('50')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $50
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('100')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $100
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('500')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $500
                </button>
              </div>

              {/* Success Info */}
              <div className="bg-green-900/30 rounded-xl p-3 border border-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={16} />
                  <p className="text-xs text-green-800 font-medium">
                    Se acreditará inmediatamente
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/panel')}
                  className="flex-1 px-4 py-3 border-2 border-gray-600 text-gray-300 rounded-xl font-semibold hover:bg-gray-800/50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all text-sm"
                >
                  {processing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
