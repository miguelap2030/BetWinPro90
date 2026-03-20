import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminRole, useAdminDashboardStats } from '../../hooks/useAdminRole.js'
import { useSignOut } from '../../hooks/useQueries.js'
import { Navigate } from 'react-router-dom'
import {
  Users, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, Wallet, ArrowUpRight, ArrowDownLeft, Activity, Shield, UserCheck,
  LogOut
} from 'lucide-react'
import AdminUsers from './AdminUsers'
import AdminWithdrawals from './AdminWithdrawals'
import AdminDeposits from './AdminDeposits'

// Componente para tarjetas de estadísticas
function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <div className="glass-card p-6 rounded-2xl hover:shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color}`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        {subtitle && (
          <span className="text-xs text-gray-400 font-medium">{subtitle}</span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-white mb-2">{value}</h3>
      <p className="text-gray-400 text-sm">{title}</p>
    </div>
  )
}

// Componente de pestañas
function TabButton({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
      }`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isAdmin, loading: adminLoading } = useAdminRole()
  const { stats, loading: statsLoading, refreshStats } = useAdminDashboardStats()
  const signOutMutation = useSignOut()
  const [activeTab, setActiveTab] = useState('dashboard')

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  // Si no es admin, redirigir
  if (!adminLoading && !isAdmin) {
    return <Navigate to="/dashboard/principal" replace />
  }

  // Loading
  if (adminLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando panel de administración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      {/* Header */}
      <div className="glass-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
                <p className="text-gray-400 text-sm">Gestión y monitoreo de la plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshStats}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium hover:shadow-lg transition-all duration-200"
              >
                Actualizar
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 font-medium hover:bg-red-500/30 transition-all duration-200"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Pestañas */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <TabButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={Activity}
          >
            Dashboard
          </TabButton>
          <TabButton 
            active={activeTab === 'usuarios'} 
            onClick={() => setActiveTab('usuarios')}
            icon={Users}
          >
            Usuarios
          </TabButton>
          <TabButton 
            active={activeTab === 'retiros'} 
            onClick={() => setActiveTab('retiros')}
            icon={ArrowUpRight}
          >
            Retiros
            {stats?.retiros_pendientes > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-pink-500 rounded-full text-xs font-bold">
                {stats?.retiros_pendientes}
              </span>
            )}
          </TabButton>
          <TabButton 
            active={activeTab === 'depositos'} 
            onClick={() => setActiveTab('depositos')}
            icon={ArrowDownLeft}
          >
            Depósitos
            {stats?.deposits_pendientes > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-500 rounded-full text-xs font-bold">
                {stats?.deposits_pendientes}
              </span>
            )}
          </TabButton>
        </div>

        {/* Contenido de las pestañas */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Usuarios"
                value={stats?.total_usuarios || 0}
                icon={Users}
                color="from-purple-500 to-purple-600"
                subtitle={`${stats?.usuarios_activos || 0} activos`}
              />
              <StatCard
                title="Total Invertido"
                value={`$${(stats?.total_invertido || 0).toFixed(2)}`}
                icon={DollarSign}
                color="from-green-500 to-green-600"
              />
              <StatCard
                title="Total Retirado"
                value={`$${(stats?.total_retirado || 0).toFixed(2)}`}
                icon={TrendingDown}
                color="from-pink-500 to-pink-600"
              />
              <StatCard
                title="Profit Distribuido"
                value={`$${(stats?.profit_distribuido || 0).toFixed(2)}`}
                icon={TrendingUp}
                color="from-blue-500 to-blue-600"
              />
            </div>

            {/* Segunda fila de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Balance Disponible"
                value={`$${(stats?.total_disponible || 0).toFixed(2)}`}
                icon={Wallet}
                color="from-cyan-500 to-cyan-600"
              />
              <StatCard
                title="Comisiones MLM"
                value={`$${(stats?.total_comisiones || 0).toFixed(2)}`}
                icon={Activity}
                color="from-orange-500 to-orange-600"
              />
              <StatCard
                title="Retiros Pendientes"
                value={stats?.retiros_pendientes || 0}
                icon={Clock}
                color="from-yellow-500 to-yellow-600"
              />
              <StatCard
                title="Depósitos Pendientes"
                value={stats?.deposits_pendientes || 0}
                icon={CheckCircle}
                color="from-emerald-500 to-emerald-600"
              />
            </div>

            {/* Resumen de Depósitos y Retiros */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Depósitos Totales */}
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Depósitos</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Completados</span>
                    <span className="text-white font-bold">${(stats?.total_depositos || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Pendientes</span>
                    <span className="text-yellow-400 font-bold">{stats?.deposits_pendientes || 0}</span>
                  </div>
                </div>
              </div>

              {/* Retiros Totales */}
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Retiros</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Completados</span>
                    <span className="text-white font-bold">${(stats?.total_retiros || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Pendientes</span>
                    <span className="text-yellow-400 font-bold">{stats?.retiros_pendientes || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usuarios Activos vs Inactivos */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Estado de Usuarios</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-500/10 rounded-xl">
                  <p className="text-3xl font-bold text-green-400">{stats?.usuarios_activos || 0}</p>
                  <p className="text-gray-400 text-sm mt-1">Activos</p>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-xl">
                  <p className="text-3xl font-bold text-red-400">{stats?.usuarios_inactivos || 0}</p>
                  <p className="text-gray-400 text-sm mt-1">Inactivos</p>
                </div>
                <div className="text-center p-4 bg-purple-500/10 rounded-xl">
                  <p className="text-3xl font-bold text-purple-400">{stats?.total_usuarios || 0}</p>
                  <p className="text-gray-400 text-sm mt-1">Totales</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && <AdminUsers />}
        {activeTab === 'retiros' && <AdminWithdrawals />}
        {activeTab === 'depositos' && <AdminDeposits />}
      </div>
    </div>
  )
}
