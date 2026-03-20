import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { useProfile, useTransactions, useCommissions, useSignOut } from '../hooks/useQueries'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Wallet,
  Trophy,
  Gift,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search
} from 'lucide-react'

export default function Transacciones() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

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

  // React Query hooks con caché automático
  const { data: profileData } = useProfile(user?.id)
  const { data: transactionsData = [], isLoading: transactionsLoading } = useTransactions(user?.id, 100)
  const { data: commissionsData = [] } = useCommissions(user?.id)
  const signOutMutation = useSignOut()

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  // Usar useMemo para cálculos derivados
  const allTransactions = useMemo(() => {
    return [...transactionsData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [transactionsData])

  const totalByType = useMemo(() => {
    return allTransactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + (parseFloat(t.amount) || 0)
      return acc
    }, {})
  }, [allTransactions])

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit': return { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-900/30' }
      case 'withdrawal': return { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-900/30' }
      case 'profit': return { icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-900/30' }
      case 'commission': return { icon: Award, color: 'text-pink-400', bg: 'bg-pink-900/30' }
      case 'transfer_in': return { icon: ArrowUpRight, color: 'text-blue-400', bg: 'bg-blue-900/30' }
      case 'transfer_out': return { icon: ArrowDownRight, color: 'text-orange-400', bg: 'bg-orange-900/30' }
      case 'bet_win': return { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-900/30' }
      case 'bet_loss': return { icon: Wallet, color: 'text-gray-400', bg: 'bg-gray-800' }
      case 'bonus': return { icon: Gift, color: 'text-indigo-400', bg: 'bg-indigo-900/30' }
      default: return { icon: CreditCard, color: 'text-gray-400', bg: 'bg-gray-800' }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return { icon: CheckCircle2, color: 'text-green-400' }
      case 'pending': return { icon: Clock, color: 'text-yellow-400' }
      case 'failed': return { icon: XCircle, color: 'text-red-400' }
      case 'cancelled': return { icon: AlertCircle, color: 'text-gray-400' }
      default: return { icon: CheckCircle2, color: 'text-green-400' }
    }
  }

  const getTransactionLabel = (type) => {
    const labels = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      profit: 'Ganancia Diaria',
      commission: 'Comisión MLM',
      transfer_in: 'Transferencia (+)',
      transfer_out: 'Transferencia (-)',
      transfer: 'Transferencia',
      bet_win: 'Apuesta Ganada',
      bet_loss: 'Apuesta Perdida',
      bonus: 'Bono',
    }
    return labels[type] || type
  }

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'Completado',
      pending: 'Pendiente',
      failed: 'Fallido',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida'
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFilteredTransactions = () => {
    let filtered = transactionsData

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType)
    }

    return filtered
  }

  const filteredTransactions = getFilteredTransactions()

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando transacciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profileData} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="lg:ml-72 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Transacciones
          </h1>
          <p className="text-gray-400">Historial completo de todos tus movimientos</p>
        </div>

        {/* Summary Cards - Total Depositado y Retirado */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <ArrowDownToLine className="text-green-400" size={24} />
              <span className="text-xs text-green-400 font-semibold">TOTAL DEPOSITADO</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              ${(totalByType.deposit || 0).toFixed(2)}
            </p>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <ArrowUpFromLine className="text-red-400" size={24} />
              <span className="text-xs text-red-400 font-semibold">TOTAL RETIRADO</span>
            </div>
            <p className="text-2xl font-bold text-red-400">
              ${(totalByType.withdrawal || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter by type */}
            <div className="flex items-center gap-2 flex-1">
              <Filter className="text-gray-400" size={20} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-3 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none bg-white flex-1"
              >
                <option value="all">Todos los tipos</option>
                <option value="deposit">Depósitos</option>
                <option value="withdrawal">Retiros</option>
                <option value="profit">Ganancias Diarias</option>
                <option value="commission">Comisiones MLM</option>
                <option value="transfer_in">Transferencias (Entrada)</option>
                <option value="transfer_out">Transferencias (Salida)</option>
                <option value="bonus">Bonos</option>
              </select>
            </div>

            {/* Export button */}
            <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all">
              <Download size={20} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="glass-card max-h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
              <CreditCard className="text-purple-400" size={24} />
              Movimientos Recientes
            </h2>
            <span className="text-sm text-gray-400">
              {filteredTransactions.length} transacciones
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 flex-1 flex items-center justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="text-purple-400" size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-200 mb-2">
                  No hay transacciones
                </h3>
                <p className="text-gray-400">
                  Tus movimientos aparecerán aquí
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              {filteredTransactions.map((transaction) => {
                const { icon: Icon, color, bg } = getTransactionIcon(transaction.type)
                const { icon: StatusIcon, color: statusColor } = getStatusIcon(transaction.status)
                const isPositive = ['deposit', 'profit', 'commission', 'transfer_in', 'bet_win', 'bonus'].includes(transaction.type)

                return (
                  <div
                    key={transaction.id}
                    className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-3 hover:bg-gray-800 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Icono + Tipo */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`${color} w-4 h-4`} size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-200 truncate">
                            {getTransactionLabel(transaction.type)}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {new Date(transaction.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Monto */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : '-'}${Math.abs(parseFloat(transaction.amount) || 0).toFixed(2)}
                        </p>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StatusIcon className={`${statusColor} w-4 h-4`} size={16} />
                        <span className={`text-xs font-medium ${statusColor} hidden sm:inline`}>
                          {getStatusLabel(transaction.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
