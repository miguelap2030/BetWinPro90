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
  Mail,
  Calendar
} from 'lucide-react'

export default function Equipo() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [copiedId, setCopiedId] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

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
    return counts
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
    switch (level) {
      case 1: return 'from-pink-500 to-pink-600'
      case 2: return 'from-blue-500 to-blue-600'
      case 3: return 'from-green-500 to-green-600'
      default: return 'from-purple-500 to-purple-600'
    }
  }

  const getLevelBadge = (level) => {
    const colors = {
      1: 'bg-pink-100 text-pink-300',
      2: 'bg-blue-100 text-blue-300',
      3: 'bg-green-100 text-green-300',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[level] || colors[1]}`}>
        Nivel {level}
      </span>
    )
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
      <main className="lg:ml-72 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Mi Equipo
          </h1>
          <p className="text-gray-400">Gestiona y visualiza tu red de referidos</p>
        </div>

        {/* Link de Referido */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Award className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-200">Tu Link de Referido</h2>
              <p className="text-sm text-gray-400">Comparte este link y gana comisiones por cada nivel</p>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg px-4 py-3 font-mono text-sm text-purple-300 break-all">
                {profileData?.referral_code
                  ? `${window.location.origin}/signup?ref=${profileData.referral_code}`
                  : 'Generando link...'
                }
              </div>
              <button
                onClick={copyReferralLink}
                disabled={!profileData?.referral_code || copiedLink}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  copiedLink
                    ? 'bg-green-900/300 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                {copiedLink ? (
                  <>
                    <Check size={20} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    Copiar Link
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1 bg-pink-100 text-pink-300 px-3 py-1 rounded-full">
                <span className="font-bold">5%</span> Nivel 1
              </span>
              <span className="flex items-center gap-1 bg-blue-100 text-blue-300 px-3 py-1 rounded-full">
                <span className="font-bold">3%</span> Nivel 2
              </span>
              <span className="flex items-center gap-1 bg-green-100 text-green-300 px-3 py-1 rounded-full">
                <span className="font-bold">1%</span> Nivel 3
              </span>
            </div>
          </div>
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
            <p className="text-2xl font-bold text-purple-400">{referralStats.total}</p>
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
            <p className="text-2xl font-bold text-pink-400">{referralStats.level1}</p>
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
            <p className="text-2xl font-bold text-blue-400">{referralStats.level2}</p>
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
            <p className="text-2xl font-bold text-green-400">{referralStats.level3}</p>
          </button>
        </div>

        {/* Tabs - Responsive para móvil */}
        <div className="glass-card mb-4">
          <div className="flex flex-wrap gap-2 p-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs flex-1 min-w-[70px] ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              Todos ({referralStats.total})
            </button>
            <button
              onClick={() => setActiveTab('level1')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs flex-1 min-w-[70px] ${
                activeTab === 'level1'
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              N1 ({referralStats.level1})
            </button>
            <button
              onClick={() => setActiveTab('level2')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs flex-1 min-w-[70px] ${
                activeTab === 'level2'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              N2 ({referralStats.level2})
            </button>
            <button
              onClick={() => setActiveTab('level3')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all text-xs flex-1 min-w-[70px] ${
                activeTab === 'level3'
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              N3 ({referralStats.level3})
            </button>
          </div>
        </div>

        {/* Referrals List - Responsive para móvil */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
            <h2 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <Users className="text-purple-400" size={18} />
              {activeTab === 'all'
                ? 'Todos los Referidos'
                : `Referidos Nivel ${activeTab.replace('level', '')}`
              }
            </h2>
            <span className="text-xs text-gray-400">
              {filteredReferrals.length} {filteredReferrals.length === 1 ? 'miembro' : 'miembros'}
            </span>
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="text-purple-400" size={36} />
              </div>
              <h3 className="text-base font-bold text-gray-200 mb-2">
                No tienes referidos
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                ¡Comparte tu link para hacer crecer tu red!
              </p>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-xl">
                <Award className="text-purple-400" size={16} />
                <span className="font-bold text-purple-300 text-sm">{profileData?.referral_code}</span>
                <button
                  onClick={() => copyReferralCode(profileData?.referral_code, 'profile')}
                  className="ml-2 hover:text-purple-900"
                >
                  {copiedId === 'profile' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredReferrals.map((referral, index) => {
                const userData = referral.profiles || referral
                const balanceInvertido = userData.balance_invertido ?? referral.balance_invertido ?? 0
                const fechaRegistro = userData.joined_date || userData.created_at
                
                return (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-lg border border-gray-700 p-3 hover:shadow-md hover:border-purple-300 transition-all"
                  >
                    {/* Header con nivel y inicial */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 bg-gradient-to-br ${getLevelColor(referral.level)} rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {userData.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          referral.level === 1 ? 'bg-pink-100 text-pink-300' :
                          referral.level === 2 ? 'bg-blue-100 text-blue-300' :
                          'bg-green-100 text-green-300'
                        }`}>
                          N{referral.level}
                        </span>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-2">
                      <p className="text-xs text-gray-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-gray-200 truncate" title={userData.email}>
                        {userData.email || '---'}
                      </p>
                    </div>

                    {/* Fecha y Saldo */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1">
                        <p className="text-gray-400 mb-1">Registro</p>
                        <p className="text-gray-400 font-medium">
                          {fechaRegistro
                            ? new Date(fechaRegistro).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short'
                              })
                            : '---'
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 mb-1">Invertido</p>
                        <p className="text-green-400 font-bold">
                          ${balanceInvertido.toFixed(2)}
                        </p>
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
