import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { useDashboardSummary, useSignOut, useTransferInternal, useProfile } from '../hooks/useQueries'
import {
  DollarSign,
  TrendingUp,
  Shield,
  Award,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  PiggyBank
} from 'lucide-react'

export default function Panel() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferType, setTransferType] = useState('to_invested')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        navigate('/signin')
        return
      }

      setUser(session.user)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // React Query hooks
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardSummary(user?.id)
  const { data: profileData } = useProfile(user?.id)
  const signOutMutation = useSignOut()
  const transferMutation = useTransferInternal()

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  // Manejar error del dashboard
  useEffect(() => {
    if (dashboardError) {
      console.error('Error cargando dashboard:', dashboardError)
    }
  }, [dashboardError])

  // Datos por defecto si no hay datos aún
  const data = dashboardData || {
    username: '',
    email: '',
    referral_code: '',
    sponsor_username: '',
    total_referrals: 0,
    level_1_count: 0,
    level_2_count: 0,
    level_3_count: 0,
    balance_disponible: 0,
    balance_invertido: 0,
    total_retirado: 0,
    total_comisiones: 0,
    total_earnings: 0,
  }

  // Extraer variables del dashboard para uso directo
  const {
    total_referrals = 0,
    level_1_count = 0,
    level_2_count = 0,
    level_3_count = 0,
  } = data || {}

  const handleTransfer = async (e) => {
    e.preventDefault()

    const amount = parseFloat(transferAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    if (transferType === 'to_invested' && amount > (balance_disponible || 0)) {
      alert('Saldo insuficiente')
      return
    }

    if (transferType === 'from_invested' && amount > (balance_invertido || 0)) {
      alert('Saldo invertido insuficiente')
      return
    }

    try {
      await transferMutation.mutateAsync({
        userId: user.id,
        amount,
        type: transferType,
      })

      setShowTransferModal(false)
      setTransferAmount('')
      alert('Transferencia completada')
    } catch (error) {
      console.error('Error en transferencia:', error)
      alert('Error en la transferencia: ' + error.message)
    }
  }

  if (dashboardLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profileData} onSignOut={handleSignOut} />

      {/* Main Content - Responsive para móvil */}
      <main className="lg:ml-0 p-3 pt-20 pb-24">
        {/* Welcome Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            ¡Bienvenido!
          </h1>
          <p className="text-xs text-gray-400">
            {data.sponsor_username && (
              <span className="flex items-center justify-center gap-1">
                <Users size={14} />
                Sponsor: <strong className="text-gray-300">{data.sponsor_username}</strong>
              </span>
            )}
          </p>
        </div>

        {/* Wallet Stats - Responsive para móvil */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => navigate('/dashboard/depositar')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Balance Disponible</p>
            <p className="text-xl font-bold text-purple-400">
              ${data.balance_disponible?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-purple-400 mt-1">Toca para depositar</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/transferir')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Balance Invertido</p>
            <p className="text-xl font-bold text-green-400">
              ${data.balance_invertido?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-green-400 mt-1">Toca para transferir</p>
          </button>

          <button
            onClick={() => navigate('/dashboard/retirar')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95 text-left"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Total Retirado</p>
            <p className="text-xl font-bold text-yellow-400">
              ${data.total_retirado?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-yellow-400 mt-1">Toca para retirar</p>
          </button>

          <div className="glass-card p-4 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Award className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Total Comisiones</p>
            <p className="text-xl font-bold text-pink-400">
              ${data.total_comisiones?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team Overview */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-gray-200">Tu Red de Referidos</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <Users size={24} className="opacity-80" />
                  <span className="text-3xl font-bold">{total_referrals || 0}</span>
                </div>
                <p className="text-sm opacity-90 mt-2">Total</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <TrendingUp size={24} className="opacity-80" />
                  <span className="text-3xl font-bold">{level_1_count || 0}</span>
                </div>
                <p className="text-sm opacity-90 mt-2">Nivel 1</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <TrendingUp size={24} className="opacity-80" />
                  <span className="text-3xl font-bold">{level_2_count || 0}</span>
                </div>
                <p className="text-sm opacity-90 mt-2">Nivel 2</p>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <TrendingUp size={24} className="opacity-80" />
                  <span className="text-3xl font-bold">{level_3_count || 0}</span>
                </div>
                <p className="text-sm opacity-90 mt-2">Nivel 3</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="text-green-400" size={24} />
              <h2 className="text-xl font-bold text-gray-200">Acciones Rápidas</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowTransferModal(true)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 hover:from-purple-900/50 hover:to-pink-900/50 rounded-xl transition-all group border border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <RefreshCw className="text-white" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-200">Transferir Fondos</p>
                    <p className="text-sm text-gray-400">Entre disponible e invertido</p>
                  </div>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-purple-400 transition-colors" size={20} />
              </button>

              <button
                onClick={() => navigate('/dashboard/depositar')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-900/30 to-blue-900/30 hover:from-green-900/50 hover:to-blue-900/50 rounded-xl transition-all group border border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-white" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-200">Depositar</p>
                    <p className="text-sm text-gray-400">Agrega fondos a tu cuenta</p>
                  </div>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-green-400 transition-colors" size={20} />
              </button>

              <button
                onClick={() => navigate('/dashboard/retirar')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 hover:from-yellow-900/50 hover:to-orange-900/50 rounded-xl transition-all group border border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Award className="text-white" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-200">Retirar</p>
                    <p className="text-sm text-gray-400">Retira tus ganancias</p>
                  </div>
                </div>
                <ArrowUpRight className="text-gray-400 group-hover:text-yellow-400 transition-colors" size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-md p-6 rounded-2xl">
              <h3 className="text-xl font-bold text-gray-200 mb-4">Transferir Fondos</h3>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Transferencia
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferType('to_invested')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        transferType === 'to_invested'
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 hover:border-gray-6000'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-200">A Invertido</p>
                      <p className="text-xs text-gray-400">Genera 3% diario</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransferType('from_invested')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        transferType === 'from_invested'
                          ? 'border-green-500 bg-green-900/30'
                          : 'border-gray-600 hover:border-gray-6000'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-200">De Invertido</p>
                      <p className="text-xs text-gray-400">Retirar inversión</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Monto
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-600 bg-gray-800/50 rounded-xl focus:border-purple-500 focus:outline-none text-gray-100"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {transferType === 'to_invested'
                      ? `Disponible: $${(data.balance_disponible || 0).toFixed(2)}`
                      : `Invertido: $${(data.balance_invertido || 0).toFixed(2)}`
                    }
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-600 rounded-xl hover:bg-gray-700/50 transition-all text-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    Transferir
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
