import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import {
  TrendingUp,
  Shield,
  Users,
  Award,
  DollarSign,
  ArrowRight,
  CheckCircle,
  Target,
  Zap,
  Globe
} from 'lucide-react'

export default function Principal() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(profileData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
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
      <Sidebar user={user} profile={profile} onSignOut={() => {}} />

      <main className="lg:ml-0 p-3 pt-20 pb-24">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-6 mb-6 text-white shadow-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3">BetWinPro90</h1>
            <p className="text-sm opacity-90 mb-4">
              Tu plataforma de inversión inteligente
            </p>
            <button
              onClick={() => navigate('/dashboard/panel')}
              className="bg-gray-800 text-purple-400 px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              Ir a mi Panel
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Características */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 text-center">
            ¿Qué es BetWinPro90?
          </h2>

          <div className="glass-card p-5 mb-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              BetWinPro90 es una plataforma integral que combina <strong className="text-purple-400">inversión en criptomonedas</strong>,
              <strong className="text-pink-400"> sistema MLM unilevel</strong> y
              <strong className="text-blue-400"> apuestas deportivas</strong> en un solo lugar.
            </p>
          </div>
        </div>

        {/* Pilares */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 text-center">
            Nuestros Pilares
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {/* Inversión */}
            <div className="glass-card p-4 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">Inversión Cripto</h3>
                  <p className="text-xs text-gray-400">Ganancias diarias</p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span>3% diario sobre capital invertido</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Retiros flexibles cuando quieras</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Interés compuesto automático</span>
                </li>
              </ul>
            </div>

            {/* MLM */}
            <div className="glass-card p-4 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">Sistema MLM</h3>
                  <p className="text-xs text-gray-400">3 niveles de comisión</p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span>5% nivel 1 (referidos directos)</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span>3% nivel 2</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span>1% nivel 3</span>
                </li>
              </ul>
            </div>

            {/* Apuestas */}
            <div className="glass-card p-4 hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Award className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-200">Apuestas Deportivas</h3>
                  <p className="text-xs text-gray-400">Próximamente</p>
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Múltiples deportes disponibles</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Mejores cuotas del mercado</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Apuestas en vivo</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Beneficios */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 text-center">
            Beneficios
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-gray-200 text-sm mb-1">Seguridad</h3>
              <p className="text-xs text-gray-400">Tus fondos protegidos</p>
            </div>

            <div className="glass-card p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-gray-200 text-sm mb-1">Rapidez</h3>
              <p className="text-xs text-gray-400">Transacciones rápidas</p>
            </div>

            <div className="glass-card p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Globe className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-gray-200 text-sm mb-1">Global</h3>
              <p className="text-xs text-gray-400">Disponible en todo el mundo</p>
            </div>

            <div className="glass-card p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-gray-200 text-sm mb-1">Objetivos</h3>
              <p className="text-xs text-gray-400">Metas claras</p>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="glass-card p-6 text-center">
          <DollarSign className="text-purple-400 mx-auto mb-3" size={48} />
          <h2 className="text-xl font-bold text-gray-200 mb-2">
            Comienza a Ganar Hoy
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Únete a miles de usuarios que ya están generando ingresos pasivos
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/dashboard/panel')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all"
            >
              Ir a mi Panel
            </button>
            <button
              onClick={() => navigate('/dashboard/equipo')}
              className="w-full bg-gray-800 border-2 border-purple-500 text-purple-400 px-6 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
            >
              Ver mi Equipo
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6 mb-4">
          © 2024 BetWinPro90. Todos los derechos reservados.
        </p>
      </main>
    </div>
  )
}
