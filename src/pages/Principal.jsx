import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { useProfile, useSignOut } from '../hooks/useQueries'
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
  Globe,
  Brain,
  Rocket,
  BookOpen,
  Video,
  MessageCircle,
  Send,
  HelpCircle,
  Lightbulb,
  Star,
  Trophy,
  Lock,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  UserPlus,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Play,
  Sparkles,
  Crown,
  Gem,
  TrendingDown,
  RefreshCw,
  Info,
  AlertCircle
} from 'lucide-react'

// Componente para tarjetas de características
function FeatureCard({ icon: Icon, title, description, color, delay = 0 }) {
  return (
    <div 
      className="glass-card p-5 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="text-white w-7 h-7" />
      </div>
      <h3 className="font-bold text-gray-200 text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}

// Componente para pasos de guía
function StepCard({ number, title, description, icon: Icon }) {
  return (
    <div className="flex gap-4 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-all">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="text-purple-400 w-5 h-5" />
          <h4 className="font-bold text-gray-200">{title}</h4>
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  )
}

// Componente para estadísticas
function StatItem({ value, label, icon: Icon, color }) {
  return (
    <div className="text-center p-4 bg-gray-800/30 rounded-xl">
      <Icon className={`${color} w-6 h-6 mx-auto mb-2`} />
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}

// Componente para preguntas frecuentes
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="border border-gray-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left bg-gray-800/30 hover:bg-gray-800/50 transition-all flex items-center justify-between gap-4"
      >
        <span className="font-medium text-gray-200 text-sm">{question}</span>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-900/50 border-t border-gray-700/50">
          <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function Principal() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const { data: profile } = useProfile(user?.id)
  const signOutMutation = useSignOut()

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

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  if (!user) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 overflow-x-hidden">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />

      <main className="lg:ml-0 p-0 pt-20 pb-24">
        {/* Hero Section con Animación */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900 via-pink-900 to-blue-900 py-16 px-4">
          {/* Efecto de partículas */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -top-36 -left-36 animate-pulse" />
            <div className="absolute w-96 h-96 bg-pink-500/15 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000" />
            <div className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse delay-500" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Plataforma de Inversión Inteligente</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              BetWinPro90
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto">
              Multiplica tu capital con <span className="text-purple-300 font-semibold">tecnología IA</span> y 
              <span className="text-pink-300 font-semibold"> expertos traders</span>
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard/panel')}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-1 flex items-center gap-3"
              >
                <Rocket className="w-5 h-5" />
                Ir a mi Panel
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => navigate('/dashboard/depositar')}
                className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
              >
                <Wallet className="w-5 h-5" />
                Depositar Ahora
              </button>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold text-purple-300">3%</p>
                <p className="text-sm text-gray-300">Ganancia Diaria</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold text-pink-300">91%</p>
                <p className="text-sm text-gray-300">Tasa de Éxito IA</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold text-blue-300">24/7</p>
                <p className="text-sm text-gray-300">Operaciones</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <p className="text-3xl font-bold text-green-300">+10K</p>
                <p className="text-sm text-gray-300">Usuarios Activos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contenedor Principal */}
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
          
          {/* ==================== SECCIÓN: ¿CÓMO FUNCIONA? ==================== */}
          <section>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 rounded-full text-purple-400 text-sm font-medium mb-4">
                <Lightbulb className="w-4 h-4" />
                <span>Descubre nuestro ecosistema</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                ¿Cómo Funciona BetWinPro90?
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Tres pilares fundamentales para maximizar tus ganancias
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Inversión Cripto */}
              <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full" />
                
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="text-white w-8 h-8" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-gray-200">Inversión Cripto</h3>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">
                    3% DIARIO
                  </span>
                </div>
                
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  Tu capital trabaja 24/7 generando rendimientos constantes. Retira cuando quieras sin restricciones.
                </p>
                
                <ul className="space-y-3">
                  {[
                    '3% diario sobre capital invertido',
                    'Interés compuesto automático',
                    'Retiros flexibles 24/7',
                    'Sin períodos de bloqueo'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle className="text-green-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => navigate('/dashboard/panel')}
                  className="mt-6 w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
                >
                  Invertir Ahora
                </button>
              </div>

              {/* Sistema MLM */}
              <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 to-transparent rounded-bl-full" />
                
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Users className="text-white w-8 h-8" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-gray-200">Sistema MLM</h3>
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 text-xs font-bold rounded-full">
                    3 NIVELES
                  </span>
                </div>
                
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  Gana comisiones por referir usuarios. Construye tu red y genera ingresos pasivos recurrentes.
                </p>
                
                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
                    <span className="text-sm text-gray-300">Nivel 1</span>
                    <span className="text-green-400 font-bold">5%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
                    <span className="text-sm text-gray-300">Nivel 2</span>
                    <span className="text-green-400 font-bold">3%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg">
                    <span className="text-sm text-gray-300">Nivel 3</span>
                    <span className="text-green-400 font-bold">1%</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate('/dashboard/equipo')}
                  className="mt-0 w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-pink-500/30 transition-all duration-300"
                >
                  Ver mi Red
                </button>
              </div>

              {/* Apuestas Deportivas */}
              <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
                
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="text-white w-8 h-8" />
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-bold text-gray-200">Apuestas IA</h3>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
                    91% EFECTIVIDAD
                  </span>
                </div>
                
                <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                  Nuestra IA analiza miles de datos en tiempo real para hacer predicciones de alta precisión.
                </p>
                
                <ul className="space-y-3">
                  {[
                    'Análisis con Inteligencia Artificial',
                    'Múltiples deportes disponibles',
                    'Apuestas en vivo',
                    'Mejores cuotas del mercado'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                      <CheckCircle className="text-blue-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-xs text-yellow-400 text-center font-medium">
                    🚀 Próximamente disponible
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECCIÓN: ¿POR QUÉ ELEGIRNOS? ==================== */}
          <section>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 rounded-full text-pink-400 text-sm font-medium mb-4">
                <Crown className="w-4 h-4" />
                <span>Ventajas exclusivas</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                ¿Por Qué Elegir BetWinPro90?
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Somos más que una plataforma de inversión
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={Brain}
                title="IA Avanzada"
                description="Algoritmos de machine learning que analizan millones de datos para maximizar tus ganancias."
                color="from-purple-500 to-purple-600"
                delay={0}
              />
              <FeatureCard
                icon={Shield}
                title="Seguridad Total"
                description="Tus fondos están protegidos con tecnología blockchain y encriptación de grado militar."
                color="from-green-500 to-green-600"
                delay={100}
              />
              <FeatureCard
                icon={Zap}
                title="Retiros Rápidos"
                description="Procesamos tus retiros en tiempo récord. Tu dinero disponible cuando lo necesitas."
                color="from-yellow-500 to-orange-500"
                delay={200}
              />
              <FeatureCard
                icon={Globe}
                title="Plataforma Global"
                description="Disponible en todo el mundo. Únete a miles de usuarios en más de 50 países."
                color="from-blue-500 to-cyan-500"
                delay={300}
              />
              <FeatureCard
                icon={Percent}
                title="Altos Rendimientos"
                description="Hasta 90% de retorno anual con nuestro sistema de interés compuesto."
                color="from-pink-500 to-rose-500"
                delay={400}
              />
              <FeatureCard
                icon={Clock}
                title="Soporte 24/7"
                description="Nuestro equipo de soporte está disponible siempre que lo necesites."
                color="from-indigo-500 to-purple-500"
                delay={500}
              />
              <FeatureCard
                icon={BarChart3}
                title="Transparencia"
                description="Dashboard en tiempo real. Sigue cada movimiento de tu inversión."
                color="from-emerald-500 to-teal-500"
                delay={600}
              />
              <FeatureCard
                icon={Gem}
                title="Comunidad VIP"
                description="Acceso a grupo exclusivo con señales premium y estrategias de inversión."
                color="from-amber-500 to-orange-500"
                delay={700}
              />
            </div>
          </section>

          {/* ==================== SECCIÓN: GUÍA DE DEPÓSITO ==================== */}
          <section>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full text-green-400 text-sm font-medium mb-4">
                <ArrowDownLeft className="w-4 h-4" />
                <span>Empieza a invertir</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                ¿Cómo Depositar?
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Sigue estos simples pasos para comenzar a generar ganancias
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <StepCard
                number={1}
                title="Ve a la sección Depositar"
                description="Desde el menú lateral, haz clic en 'Depositar' o usa el botón directo en tu dashboard."
                icon={Wallet}
              />
              <StepCard
                number={2}
                title="Elige el monto"
                description="Selecciona cuánto quieres invertir. Mínimo $0.50 USD. ¡Entre más inviertas, más ganas!"
                icon={DollarSign}
              />
              <StepCard
                number={3}
                title="Realiza la transferencia"
                description="Copia tu dirección de wallet única BEP20 y envía tus USDT (Red BEP20/BSC)."
                icon={Send}
              />
              <StepCard
                number={4}
                title="Confirma y espera"
                description="Pega el hash de transacción y espera la confirmación. ¡Listo! Tu saldo se actualizará."
                icon={CheckCircle}
              />
            </div>

            <div className="mt-8 glass-card p-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <Info className="text-blue-400 w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-200 mb-2">💡 Consejos Importantes</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Usa siempre la red <strong className="text-gray-300">BEP20 (BSC)</strong> para menores comisiones</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Guarda el <strong className="text-gray-300">hash de transacción</strong> como comprobante</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Las confirmaciones toman entre <strong className="text-gray-300">5-30 minutos</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>El monto mínimo es <strong className="text-gray-300">$0.50 USD</strong> para comenzar</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => navigate('/dashboard/depositar')}
                className="group bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
              >
                <ArrowDownLeft className="w-5 h-5" />
                Ir a Depositar
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          {/* ==================== SECCIÓN: GUÍA DE RETIRO ==================== */}
          <section>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 rounded-full text-pink-400 text-sm font-medium mb-4">
                <ArrowUpRight className="w-4 h-4" />
                <span>Disfruta tus ganancias</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-4">
                ¿Cómo Retirar?
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Retira tus ganancias de forma rápida y segura
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <StepCard
                number={1}
                title="Ve a la sección Retirar"
                description="Desde el menú lateral, selecciona 'Retirar' para iniciar el proceso."
                icon={Wallet}
              />
              <StepCard
                number={2}
                title="Ingresa el monto"
                description="Especifica cuánto quieres retirar. Mínimo $0.50 USD. Verifica tu saldo disponible."
                icon={DollarSign}
              />
              <StepCard
                number={3}
                title="Proporciona tu wallet"
                description="Ingresa tu dirección de wallet USDT (Red BEP20/BSC). ¡Verifica que sea correcta!"
                icon={Send}
              />
              <StepCard
                number={4}
                title="Solicita y espera"
                description="Envía tu solicitud. Nuestro equipo la procesará en 24-48 horas hábiles."
                icon={Clock}
              />
            </div>

            <div className="mt-8 glass-card p-6 max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <AlertCircle className="text-yellow-400 w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-200 mb-2">⚠️ Información Importante</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Tiempo de procesamiento: <strong className="text-gray-300">24-48 horas hábiles</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Monto mínimo de retiro: <strong className="text-gray-300">$0.50 USD</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Comisión de red: <strong className="text-gray-300">$1 USD (fija)</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>Verifica <strong className="text-gray-300">dos veces</strong> la dirección de wallet</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => navigate('/dashboard/retirar')}
                className="group bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-pink-500/30 transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
              >
                <ArrowUpRight className="w-5 h-5" />
                Solicitar Retiro
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </section>

          {/* ==================== SECCIÓN: NUESTRA TECNOLOGÍA ==================== */}
          <section className="glass-card p-8 relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl" />
            
            <div className="relative">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-4">
                  <Brain className="w-4 h-4" />
                  <span>Tecnología de punta</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                  IA + Expertos = Máximo Rendimiento
                </h2>
                <p className="text-gray-400 max-w-3xl mx-auto text-lg">
                  Nuestra ventaja competitiva combina lo mejor de dos mundos
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* IA */}
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-purple-500/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <Brain className="text-white w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">Inteligencia Artificial</h3>
                      <p className="text-sm text-purple-400">Análisis predictivo avanzado</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Analiza <strong className="text-white">+10,000 variables</strong> por segundo</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Aprende y mejora continuamente con <strong className="text-white">machine learning</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Detecta patrones invisibles para humanos</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Opera <strong className="text-white">24/7</strong> sin descanso</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-purple-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Tasa de efectividad del <strong className="text-green-400">91%</strong></span>
                    </li>
                  </ul>
                </div>

                {/* Expertos */}
                <div className="bg-gray-800/50 rounded-2xl p-6 border border-pink-500/20">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center">
                      <Users className="text-white w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-200">Traders Expertos</h3>
                      <p className="text-sm text-pink-400">Experiencia humana</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-3 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-pink-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Equipo con <strong className="text-white">+10 años</strong> en mercados cripto</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-pink-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Estrategias probadas en múltiples condiciones de mercado</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-pink-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Gestión profesional de <strong className="text-white">riesgo</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-pink-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Supervisión constante de operaciones</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="text-pink-400 w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>Decisiones estratégicas en tiempo real</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Resultado */}
              <div className="mt-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/30">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-200 mb-4">
                    🎯 Resultado: Rendimiento Optimizado
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    La combinación de IA y experiencia humana nos permite tomar decisiones más inteligentes, 
                    minimizar riesgos y maximizar tus ganancias de forma consistente.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-400">+36%</p>
                      <p className="text-xs text-gray-400 mt-1">Rendimiento Mensual</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-400">91%</p>
                      <p className="text-xs text-gray-400 mt-1">Precisión IA</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-pink-400">24/7</p>
                      <p className="text-xs text-gray-400 mt-1">Operaciones Activas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================== SECCIÓN: PREGUNTAS FRECUENTES ==================== */}
          <section>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full text-blue-400 text-sm font-medium mb-4">
                <HelpCircle className="w-4 h-4" />
                <span>Resolvemos tus dudas</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                Preguntas Frecuentes
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Encuentra respuestas a las preguntas más comunes
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              <FAQItem
                question="¿Cuál es el monto mínimo para invertir?"
                answer="El monto mínimo para comenzar a invertir es de $0.50 USD. No hay un monto máximo, puedes invertir la cantidad que desees."
              />
              <FAQItem
                question="¿Cuándo puedo retirar mis ganancias?"
                answer="Puedes solicitar retiros en cualquier momento. Las ganancias diarias del 3% se acreditan automáticamente cada 24 horas. Los retiros se procesan en 24-48 horas hábiles."
              />
              <FAQItem
                question="¿Cómo funciona el sistema MLM?"
                answer="Ganas comisiones del 5% por referidos directos (nivel 1), 3% por referidos de nivel 2, y 1% por nivel 3. Las comisiones se calculan sobre cada depósito que realicen tus referidos."
              />
              <FAQItem
                question="¿Es seguro invertir en BetWinPro90?"
                answer="Sí, utilizamos tecnología blockchain para transparencia total, encriptación de grado militar para proteger tus datos, y nuestros fondos están respaldados por las operaciones de trading."
              />
              <FAQItem
                question="¿Qué criptomonedas aceptan?"
                answer="Actualmente aceptamos USDT (Tether) en la red BEP20 (BSC). Esta red ofrece las comisiones más bajas y transacciones rápidas."
              />
              <FAQItem
                question="¿Necesito experiencia para invertir?"
                answer="No, nuestra plataforma está diseñada para ser fácil de usar. Nuestro equipo de expertos y la IA se encargan de todo el trabajo técnico."
              />
            </div>
          </section>

          {/* ==================== SECCIÓN: SOPORTE Y COMUNIDAD ==================== */}
          <section className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-full text-indigo-400 text-sm font-medium mb-4">
                <MessageCircle className="w-4 h-4" />
                <span>Estamos contigo</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Soporte y Comunidad
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Únete a nuestra comunidad y obtén soporte cuando lo necesites
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Telegram Soporte */}
              <a
                href="https://t.me/BetWinPro90Soporte"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="text-white w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-200">Soporte Técnico</h3>
                    <p className="text-sm text-blue-400">Atención personalizada</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  ¿Tienes dudas o problemas? Nuestro equipo de soporte está disponible 24/7 para ayudarte.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Respuesta en menos de 1 hora</span>
                  <ExternalLink className="text-blue-400 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Telegram Comunidad */}
              <a
                href="https://t.me/BetWinPro90Comunidad"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="text-white w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-200">Comunidad Oficial</h3>
                    <p className="text-sm text-purple-400">Únete al grupo</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Forma parte de nuestra comunidad. Comparte experiencias, estrategias y entérate de las últimas novedades.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">+10,000 miembros activos</span>
                  <ExternalLink className="text-purple-400 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <a
                href="https://t.me/BetWinPro90Soporte"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
              >
                <MessageCircle className="w-5 h-5" />
                Contactar Soporte
              </a>
              <a
                href="https://t.me/BetWinPro90Comunidad"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
              >
                <Users className="w-5 h-5" />
                Unirme a la Comunidad
              </a>
            </div>
          </section>

          {/* ==================== SECCIÓN: CTA FINAL ==================== */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-8 md:p-12">
            {/* Efectos de fondo */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute w-64 h-64 bg-white/10 rounded-full blur-3xl -top-32 -left-32 animate-pulse" />
              <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000" />
            </div>

            <div className="relative text-center text-white">
              <Star className="w-16 h-16 mx-auto mb-6 text-yellow-400 animate-pulse" />
              
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
                ¿Listo para Comenzar?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Únete a miles de usuarios que ya están generando ingresos pasivos con BetWinPro90
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => navigate('/dashboard/panel')}
                  className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 inline-flex items-center gap-3"
                >
                  <Rocket className="w-5 h-5" />
                  Ir a mi Panel
                </button>
                <button
                  onClick={() => navigate('/dashboard/depositar')}
                  className="bg-white/10 backdrop-blur-sm border-2 border-white/50 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 inline-flex items-center gap-3"
                >
                  <DollarSign className="w-5 h-5" />
                  Depositar
                </button>
              </div>

              {/* Stats finales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-3xl mx-auto">
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-1">+10K</p>
                  <p className="text-sm text-white/70">Usuarios Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-1">$2M+</p>
                  <p className="text-sm text-white/70">Invertido</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-1">91%</p>
                  <p className="text-sm text-white/70">Tasa de Éxito</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white mb-1">24/7</p>
                  <p className="text-sm text-white/70">Soporte</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-gray-500 text-sm py-8 border-t border-gray-800">
            <p className="mb-2">© 2024 BetWinPro90. Todos los derechos reservados.</p>
            <p className="text-xs">
              La inversión en criptomonedas conlleva riesgos. Invierte responsablemente.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
