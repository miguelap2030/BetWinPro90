import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserCircle,
  Menu,
  X,
  LogOut,
  Coins,
  TrendingUp,
  Shield,
  Award
} from 'lucide-react'

export default function Sidebar({ user, profile, onSignOut }) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  const navigation = [
    {
      name: 'Inicio',
      href: '/dashboard/principal',
      icon: LayoutDashboard,
      description: 'Bienvenido a BetWinPro90',
    },
    {
      name: 'Panel',
      href: '/dashboard/panel',
      icon: Users,
      description: 'Tu resumen financiero',
    },
    {
      name: 'Equipo',
      href: '/dashboard/equipo',
      icon: Users,
      description: 'Tu red de referidos',
    },
    {
      name: 'Transacciones',
      href: '/dashboard/transacciones',
      icon: CreditCard,
      description: 'Historial de movimientos',
    },
    {
      name: 'Cuenta',
      href: '/dashboard/cuenta',
      icon: UserCircle,
      description: 'Configuración de perfil',
    },
  ]

  const isActive = (href) => location.pathname === href

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-card p-3 hover:shadow-xl transition-all"
        >
          {isOpen ? <X size={24} className="text-gray-300" /> : <Menu size={24} className="text-gray-300" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 glass-card transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">B</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  BetWinPro90
                </h1>
                <p className="text-xs text-gray-400">{profile?.username || 'Usuario'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block p-4 rounded-xl transition-all duration-200 group ${
                    active
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                      : 'hover:bg-gray-800/50 text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={22}
                      className={active ? 'text-white' : 'text-purple-400 group-hover:scale-110 transition-transform'}
                    />
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className={`text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-700/50 space-y-3">
            {/* Stats mini */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={14} className="text-purple-400" />
                  <span className="text-xs text-gray-400">Referidos</span>
                </div>
                <p className="text-lg font-bold text-purple-300">
                  {profile?.referral_count ?? 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={14} className="text-green-400" />
                  <span className="text-xs text-gray-400">Balance</span>
                </div>
                <p className="text-lg font-bold text-green-300">
                  ${profile?.balance_disponible?.toFixed(0) ?? '0'}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
