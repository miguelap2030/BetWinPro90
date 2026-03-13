import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

// Páginas
import SignIn from './components/SignIn'
import SignUp from './components/SignUp'
import Panel from './pages/Panel'
import Equipo from './pages/Equipo'
import Transacciones from './pages/Transacciones'
import Cuenta from './pages/Cuenta'
import VerifyProfiles from './pages/VerifyProfiles'
import Depositar from './pages/Depositar'
import Retirar from './pages/Retirar'
import Transferir from './pages/Transferir'
import Principal from './pages/Principal'

// Página de inicio (Landing)
function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-900/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-900/40 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-900/30 rounded-full blur-3xl animate-pulse delay-500" />

      <div className="text-center relative z-10 max-w-4xl mx-auto">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-2xl mb-6 fade-in">
          <span className="text-5xl font-bold text-white">B</span>
        </div>
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 fade-in">
          BetWinPro90
        </h1>
        <p className="text-xl text-gray-600 font-light mb-12 fade-in">
          Inversión en Criptomonedas con MLM y Apuestas Deportivas
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 fade-in">
          <a
            href="/signin"
            className="gradient-btn max-w-xs inline-flex items-center justify-center"
          >
            Iniciar Sesión
          </a>

          <a
            href="/signup"
            className="secondary-btn max-w-xs inline-flex items-center justify-center"
          >
            Crear Cuenta
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 fade-in">
          <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Inversión Cripto</h3>
            <p className="text-gray-600 text-sm font-light">
              Ganancias diarias del 3% sobre tu capital invertido
            </p>
          </div>

          <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Sistema MLM</h3>
            <p className="text-gray-600 text-sm font-light">
              Comisiones del 5%, 3% y 1% por 3 niveles
            </p>
          </div>

          <div className="glass-card p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Apuestas Deportivas</h3>
            <p className="text-gray-600 text-sm font-light">
              Apuesta en tus deportes favoritos y gana
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-12">
          © 2024 BetWinPro90. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    
    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setAuthenticated(!!session)
    setLoading(false)
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

  if (!authenticated) {
    return <Navigate to="/signin" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/verify-profiles" element={<VerifyProfiles />} />

      {/* Rutas protegidas del dashboard */}
      <Route
        path="/dashboard/principal"
        element={
          <ProtectedRoute>
            <Principal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/panel"
        element={
          <ProtectedRoute>
            <Panel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/equipo"
        element={
          <ProtectedRoute>
            <Equipo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/transacciones"
        element={
          <ProtectedRoute>
            <Transacciones />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/cuenta"
        element={
          <ProtectedRoute>
            <Cuenta />
          </ProtectedRoute>
        }
      />

      {/* Rutas de transacciones */}
      <Route
        path="/dashboard/depositar"
        element={
          <ProtectedRoute>
            <Depositar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/retirar"
        element={
          <ProtectedRoute>
            <Retirar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/transferir"
        element={
          <ProtectedRoute>
            <Transferir />
          </ProtectedRoute>
        }
      />

      {/* Redirecciones */}
      <Route path="/dashboard" element={<Navigate to="/dashboard/principal" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
