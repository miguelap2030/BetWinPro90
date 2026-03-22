import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { ArrowUpFromLine, Wallet, AlertCircle, DollarSign, TrendingUp, CheckCircle } from 'lucide-react'
import { useProfile, useSignOut } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'

export default function Retirar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
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

  const handleWithdraw = async (e) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    if (!walletAddress || walletAddress.length < 20) {
      alert('Ingresa una dirección de wallet válida')
      return
    }

    const totalDisponible = (wallet?.balance_disponible || 0)
    if (parseFloat(amount) > totalDisponible) {
      alert('Saldo disponible insuficiente')
      return
    }

    setProcessing(true)

    try {
      // 1. Crear transacción de retiro directamente
      const { error: transactionError } = await supabase.rpc('create_transaction', {
        p_user_id: user.id,
        p_type: 'withdrawal',
        p_amount: parseFloat(amount),
        p_description: `Retiro a wallet: ${walletAddress.substring(0, 10)}...`,
        p_status: 'completed',
        p_reference: 'retiro_simulado'
      })

      if (transactionError) throw transactionError

      // 2. Actualizar wallet - restar del saldo disponible
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance_disponible: totalDisponible - parseFloat(amount),
          total_retirado: (wallet?.total_retirado || 0) + parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (walletError) throw walletError

      // 3. Invalidar caché para actualizar UI
      queryClient.invalidateQueries({ queryKey: ['wallet', user.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] })

      alert(`✅ Retiro de $${parseFloat(amount).toFixed(2)} completado exitosamente`)
      navigate('/dashboard/panel')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar retiro: ' + error.message)
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-1">
              Retirar Fondos
            </h1>
            <p className="text-xs text-gray-400">Retira tus ganancias a tu wallet</p>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-lg text-white">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign size={14} className="opacity-75" />
                <p className="text-xs opacity-90">Disponible</p>
              </div>
              <p className="text-xl font-bold">${wallet?.balance_disponible?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg text-white">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={14} className="opacity-75" />
                <p className="text-xs opacity-90">Invertido</p>
              </div>
              <p className="text-xl font-bold">${wallet?.balance_invertido?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gray-800 rounded-xl p-3 mb-4 shadow-sm border border-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-white" size={16} />
              </div>
              <div>
                <h3 className="font-bold text-gray-200 text-sm mb-1">Retiro sin Comisión</h3>
                <p className="text-xs text-gray-400">
                  Sin comisión de retiro. Tiempo de procesamiento: 1 a 24 horas.
                </p>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Monto a Retirar (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-3 border-2 border-gray-700 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 text-lg font-bold"
                    step="0.01"
                    min="0.5"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Mínimo: $0.50 | Máx: ${wallet?.balance_disponible?.toFixed(2) || '0.00'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Dirección Wallet (USDT BEP20)
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full pl-10 pr-3 py-3 border-2 border-gray-700 rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 font-mono text-sm"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Solo USDT en red BEP20 (BSC)</p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-yellow-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-yellow-300">
                      <li>Verifica bien la dirección</li>
                      <li>Procesamiento de 1 a 24 horas</li>
                      <li>Sin comisión de retiro</li>
                      <li>Solo USDT en red BEP20 (BSC)</li>
                    </ul>
                  </div>
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all text-sm"
                >
                  {processing ? 'Procesando...' : 'Solicitar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
