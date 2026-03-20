import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { ArrowRightLeft, ArrowDownUp, TrendingUp, DollarSign } from 'lucide-react'
import { useProfile, useTransferInternal, useSignOut } from '../hooks/useQueries'

export default function Transferir() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [transferType, setTransferType] = useState('to_invested')
  
  // Usar el hook de transferencia
  const transferMutation = useTransferInternal()
  const { data: profileData } = useProfile(user?.id)
  const signOutMutation = useSignOut()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profileData) setProfile(profileData)
  }, [profileData])

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

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  const handleTransfer = async (e) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    if (transferType === 'to_invested' && wallet?.balance_disponible < parseFloat(amount)) {
      alert('Saldo disponible insuficiente')
      return
    }

    if (transferType === 'from_invested' && wallet?.balance_invertido < parseFloat(amount)) {
      alert('Saldo invertido insuficiente')
      return
    }

    try {
      const result = await transferMutation.mutateAsync({
        userId: user.id,
        amount: parseFloat(amount),
        type: transferType
      })

      // Actualizar estado local después de la transferencia
      const feeAmount = result?.feeAmount || 0
      const amountAfterFee = result?.amountAfterFee || parseFloat(amount)
      
      const newBalanceDisponible = transferType === 'to_invested'
        ? wallet.balance_disponible - parseFloat(amount)
        : wallet.balance_disponible + amountAfterFee
      const newBalanceInvertido = transferType === 'to_invested'
        ? wallet.balance_invertido + parseFloat(amount)
        : wallet.balance_invertido - parseFloat(amount)

      setWallet({
        ...wallet,
        balance_disponible: newBalanceDisponible,
        balance_invertido: newBalanceInvertido
      })

      if (feeAmount > 0) {
        alert(`✅ Transferencia completada exitosamente\nComisión (10%): $${feeAmount.toFixed(2)}\nRecibido: $${amountAfterFee.toFixed(2)}`)
      } else {
        alert('✅ Transferencia completada exitosamente')
      }
      navigate('/dashboard/panel')
    } catch (error) {
      console.error('Error:', error)
      alert('Error en la transferencia: ' + error.message)
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
              Transferir Fondos
            </h1>
            <p className="text-xs text-gray-400">Mueve saldo entre disponible e invertido</p>
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

          {/* Tipo de Transferencia */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-700">
            <h2 className="text-base font-bold text-gray-200 mb-4 flex items-center gap-2">
              <ArrowRightLeft className="text-purple-400" size={20} />
              Tipo de Transferencia
            </h2>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setTransferType('to_invested')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  transferType === 'to_invested'
                    ? 'border-purple-500 bg-purple-900/30 shadow-md'
                    : 'border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="text-center">
                  <ArrowDownUp className={`mx-auto mb-1 ${transferType === 'to_invested' ? 'text-purple-400' : 'text-gray-400'}`} size={24} />
                  <p className={`text-xs font-semibold ${transferType === 'to_invested' ? 'text-purple-300' : 'text-gray-400'}`}>
                    Activar
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Disponible → Invertido</p>
                </div>
              </button>

              <button
                onClick={() => setTransferType('from_invested')}
                className={`p-3 rounded-xl border-2 transition-all ${
                  transferType === 'from_invested'
                    ? 'border-green-500 bg-green-900/30 shadow-md'
                    : 'border-gray-700 hover:border-green-300'
                }`}
              >
                <div className="text-center">
                  <ArrowDownUp className={`mx-auto mb-1 transform rotate-180 ${transferType === 'from_invested' ? 'text-green-400' : 'text-gray-400'}`} size={24} />
                  <p className={`text-xs font-semibold ${transferType === 'from_invested' ? 'text-green-300' : 'text-gray-400'}`}>
                    Desactivar
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Invertido → Disponible</p>
                </div>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Monto a Transferir (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-3 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-lg font-bold"
                    step="0.01"
                    min="0.5"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Mínimo: $0.50 | {transferType === 'to_invested'
                    ? `Disponible: $${wallet?.balance_disponible?.toFixed(2) || '0.00'}`
                    : `Invertido: $${wallet?.balance_invertido?.toFixed(2) || '0.00'}`
                  }
                </p>
              </div>

              {/* Summary */}
              <div className="bg-purple-900/30 rounded-xl p-3 border border-purple-700">
                <p className="text-sm text-purple-800">
                  <strong>Resumen:</strong> {transferType === 'to_invested' ? 'Activar' : 'Desactivar'} inversión de{' '}
                  <span className="font-bold">${amount || '0.00'}</span>
                </p>
                {transferType === 'from_invested' && amount && (
                  <div className="mt-2 pt-2 border-t border-purple-600 text-xs text-purple-200">
                    <p>Comisión (10%): <span className="font-bold text-red-300">-${(parseFloat(amount || 0) * 0.10).toFixed(2)}</span></p>
                    <p>Recibirás: <span className="font-bold text-green-300">${(parseFloat(amount || 0) * 0.90).toFixed(2)}</span></p>
                  </div>
                )}
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
                  disabled={transferMutation.isPending}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all text-sm"
                >
                  {transferMutation.isPending ? 'Procesando...' : 'Transferir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
