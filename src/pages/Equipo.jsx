import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { useProfile, useReferralsTree, useSignOut } from '../hooks/useQueries'
import {
  Users,
  TrendingUp,
  Award,
  Copy,
  Check,
  UserPlus,
  DollarSign,
  Shield,
  Percent,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react'

export default function Equipo() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [copiedId, setCopiedId] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showBenefits, setShowBenefits] = useState(false)

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
  const { data: profileData, error: profileError } = useProfile(user?.id)
  const { data: referralsData, isLoading: referralsLoading, error: referralsError } = useReferralsTree(user?.id)
  const signOutMutation = useSignOut()

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  // Manejar errores
  useEffect(() => {
    if (profileError) console.error('Error cargando perfil:', profileError)
    if (referralsError) console.error('Error cargando referidos:', referralsError)
  }, [profileError, referralsError])

  // Calcular estadísticas con useMemo para evitar recálculos
  const referralStats = useMemo(() => {
    const data = referralsData || []
    const counts = {
      total: data.length,
      level1: data.filter(r => r.level === 1).length,
      level2: data.filter(r => r.level === 2).length,
      level3: data.filter(r => r.level === 3).length,
    }
    
    // Calcular total invertido por nivel
    const invested = {
      level1: data.filter(r => r.level === 1).reduce((sum, r) => sum + (r.balance_invertido || 0), 0),
      level2: data.filter(r => r.level === 2).reduce((sum, r) => sum + (r.balance_invertido || 0), 0),
      level3: data.filter(r => r.level === 3).reduce((sum, r) => sum + (r.balance_invertido || 0), 0),
    }
    
    return { counts, invested }
  }, [referralsData])

  const copyReferralCode = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Error al copiar:', error)
    }
  }

  const copyReferralLink = async () => {
    if (!profileData?.referral_code) return

    const referralLink = `${window.location.origin}/signup?ref=${profileData.referral_code}`

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (error) {
      console.error('Error al copiar el link:', error)
    }
  }

  const getFilteredReferrals = () => {
    const data = referralsData || []
    if (activeTab === 'all') return data
    if (activeTab === 'level1') return data.filter(r => r.level === 1)
    if (activeTab === 'level2') return data.filter(r => r.level === 2)
    if (activeTab === 'level3') return data.filter(r => r.level === 3)
    return data
  }

  const getLevelColor = (level) => {
    const colors = {
      1: 'from-pink-500 to-pink-600',
      2: 'from-blue-500 to-blue-600',
      3: 'from-green-500 to-green-600',
    }
    return colors[level] || colors[1]
  }

  if (!user || referralsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando equipo...</p>
        </div>
      </div>
    )
  }

  const filteredReferrals = getFilteredReferrals() || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profileData} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="lg:ml-0 p-3 pt-20 pb-24">
        {/* Header */}
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">
            Mi Equipo
          </h1>
          <p className="text-xs text-gray-400">Gestiona tu red MLM y gana comisiones</p>
        </div>

        {/* Stats Cards - Responsive para móvil */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Total</p>
            <p className="text-2xl font-bold text-purple-400">{referralStats.counts.total}</p>
          </button>

          <button
            onClick={() => setActiveTab('level1')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Nivel 1</p>
            <p className="text-2xl font-bold text-pink-400">{referralStats.counts.level1}</p>
          </button>

          <button
            onClick={() => setActiveTab('level2')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Nivel 2</p>
            <p className="text-2xl font-bold text-blue-400">{referralStats.counts.level2}</p>
          </button>

          <button
            onClick={() => setActiveTab('level3')}
            className="glass-card p-4 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">Nivel 3</p>
            <p className="text-2xl font-bold text-green-400">{referralStats.counts.level3}</p>
          </button>
        </div>

        {/* Beneficios MLM - Card informativa */}
        <div className="glass-card p-4 mb-4">
          <button
            onClick={() => setShowBenefits(!showBenefits)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Award className="text-white" size={16} />
              </div>
              <span className="text-sm font-bold text-gray-200">Beneficios del Sistema MLM</span>
            </div>
            <ChevronRight className={`text-gray-400 transition-transform ${showBenefits ? 'rotate-90' : ''}`} size={18} />
          </button>

          {showBenefits && (
            <div className="mt-4 space-y-3 text-xs text-gray-300">
              <div className="bg-pink-900/20 border border-pink-700/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs">1</div>
                  <span className="font-bold text-pink-400">Nivel 1 - 5% de comisión</span>
                </div>
                <p className="text-gray-400 ml-8">
                  Ganas el <strong className="text-pink-400">5%</strong> de cada depósito de tus referidos directos.
                  Si invierten $100, recibes $5 en comisiones.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                  <span className="font-bold text-blue-400">Nivel 2 - 3% de comisión</span>
                </div>
                <p className="text-gray-400 ml-8">
                  Ganas el <strong className="text-blue-400">3%</strong> de los depósitos de los referidos de tu nivel 1.
                  Ingresos pasivos sin esfuerzo adicional.
                </p>
              </div>

              <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs">3</div>
                  <span className="font-bold text-green-400">Nivel 3 - 1% de comisión</span>
                </div>
                <p className="text-gray-400 ml-8">
                  Ganas el <strong className="text-green-400">1%</strong> de la tercera nivel de tu red.
                  ¡Tu red trabaja para ti!
                </p>
              </div>

              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-purple-400" size={14} />
                  <span className="font-bold text-purple-400">Ventajas Adicionales</span>
                </div>
                <ul className="text-gray-400 ml-6 space-y-1 list-disc">
                  <li>Comisiones automáticas sin límite de cantidad</li>
                  <li>Red ilimitada de referidos</li>
                  <li>Seguimiento en tiempo real de tu red</li>
                  <li>Retiro libre de tus comisiones</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Link de Referido - Al final antes de la lista */}
        <div className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Award className="text-white" size={16} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gray-200">Tu Link de Referido</h2>
              <p className="text-xs text-gray-400">Comparte y gana comisiones por 3 niveles</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <div className="flex gap-2">
              <div className="flex-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg px-3 py-2 font-mono text-xs text-purple-300 truncate">
                {profileData?.referral_code
                  ? `${window.location.origin}/signup?ref=${profileData.referral_code}`
                  : 'Generando...'
                }
              </div>
              <button
                onClick={copyReferralLink}
                disabled={!profileData?.referral_code || copiedLink}
                className={`flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-semibold transition-all text-xs whitespace-nowrap ${
                  copiedLink
                    ? 'bg-green-900/300 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                } disabled:opacity-50`}
              >
                {copiedLink ? (
                  <>
                    <Check size={14} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copiar
                  </>
                )}
              </button>
            </div>

            {/* Comisiones resumidas */}
            <div className="mt-3 flex gap-2 justify-center">
              <span className="flex items-center gap-1 bg-pink-100/20 text-pink-300 px-2 py-1 rounded text-xs font-bold">
                <Percent size={10} /> 5% N1
              </span>
              <span className="flex items-center gap-1 bg-blue-100/20 text-blue-300 px-2 py-1 rounded text-xs font-bold">
                <Percent size={10} /> 3% N2
              </span>
              <span className="flex items-center gap-1 bg-green-100/20 text-green-300 px-2 py-1 rounded text-xs font-bold">
                <Percent size={10} /> 1% N3
              </span>
            </div>
          </div>
        </div>

        {/* Tabs de filtrado */}
        <div className="glass-card mb-4">
          <div className="flex gap-2 p-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Todos ({referralStats.counts.total})
            </button>
            <button
              onClick={() => setActiveTab('level1')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs whitespace-nowrap ${
                activeTab === 'level1'
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Nivel 1 ({referralStats.counts.level1})
            </button>
            <button
              onClick={() => setActiveTab('level2')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs whitespace-nowrap ${
                activeTab === 'level2'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Nivel 2 ({referralStats.counts.level2})
            </button>
            <button
              onClick={() => setActiveTab('level3')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs whitespace-nowrap ${
                activeTab === 'level3'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Nivel 3 ({referralStats.counts.level3})
            </button>
          </div>
        </div>

        {/* Lista de Referidos con scroll */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
            <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Users className="text-purple-400" size={16} />
              {activeTab === 'all'
                ? 'Todos los Miembros'
                : `Nivel ${activeTab.replace('level', '')}`
              }
            </h2>
            <span className="text-xs text-gray-400">
              {filteredReferrals.length} {filteredReferrals.length === 1 ? 'miembro' : 'miembros'}
            </span>
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="text-purple-400" size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-200 mb-2">
                No tienes referidos en este nivel
              </h3>
              <p className="text-sm text-gray-400">
                ¡Comparte tu link para hacer crecer tu red!
              </p>
            </div>
          ) : (
            /* Contenedor con scroll vertical */
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800">
              {filteredReferrals.map((referral, index) => {
                // La función RPC devuelve los campos directamente (no anidados en profiles)
                const balanceInvertido = referral.balance_invertido ?? 0
                const isActive = referral.is_active !== false

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2 hover:bg-gray-800 transition-colors"
                  >
                    {/* Avatar con nivel */}
                    <div className={`w-8 h-8 bg-gradient-to-br ${getLevelColor(referral.level)} rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                      {referral.level}
                    </div>

                    {/* Email - ocupando el espacio principal */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-200 truncate" title={referral.email}>
                        {referral.email || '---'}
                      </p>
                    </div>

                    {/* Estado activo/inactivo */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-red-400'}`} title={isActive ? 'Activo' : 'Inactivo'} />

                    {/* Saldo invertido */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-green-400">
                        ${balanceInvertido.toFixed(2)}
                      </p>
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
