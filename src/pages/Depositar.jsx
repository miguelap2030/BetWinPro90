import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { DollarSign, Wallet, Copy, QrCode, AlertCircle, CheckCircle, ArrowDownToLine, Shield, Clock, Zap } from 'lucide-react'

export default function Depositar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [generatingWallet, setGeneratingWallet] = useState(false)
  const [error, setError] = useState(null)

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

      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      setWallet(walletData)
    } catch (error) {
      setError('Error al cargar datos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateWallet = async () => {
    if (!user || !profile) {
      setError('No hay usuario o perfil disponible')
      return
    }

    setGeneratingWallet(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          username: profile.username || user.email.split('@')[0],
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear wallet')
      }

      await checkUser()
      setError(null)
    } catch (error) {
      setError(error.message)
    } finally {
      setGeneratingWallet(false)
    }
  }

  const handleCopyAddress = async () => {
    const address = wallet?.trondealer_address || profile?.trondealer_address
    if (!address) return

    try {
      await navigator.clipboard.writeText(address)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error al copiar:', error)
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

  const walletAddress = wallet?.trondealer_address || profile?.trondealer_address

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 pb-24">
      <Sidebar user={user} profile={profile} onSignOut={() => navigate('/signin')} />

      <main className="lg:ml-0 p-3 pt-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
              Depositar USDT
            </h1>
            <p className="text-sm text-gray-400">Red BSC (BEP20)</p>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-5 mb-6 shadow-xl text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-xs opacity-80">Saldo Disponible</p>
                  <p className="text-2xl font-bold">${wallet?.balance_disponible?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de Error */}
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-sm text-red-200 flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xl">×</button>
              </div>
            </div>
          )}

          {/* Sección Principal */}
          {!walletAddress ? (
            /* Generar Wallet */
            <div className="bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-700 text-center">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="text-yellow-500" size={40} />
              </div>
              <h2 className="text-xl font-bold text-gray-200 mb-2">
                No tienes wallet USDT
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Genera tu dirección única para recibir depósitos en USDT (BEP20)
              </p>
              <button
                onClick={handleGenerateWallet}
                disabled={generatingWallet}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 transition-all"
              >
                {generatingWallet ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Generando...
                  </span>
                ) : (
                  'Generar Wallet USDT'
                )}
              </button>
              <p className="text-xs text-gray-500 mt-4">
                ⏱️ Se genera en segundos • Dirección única y permanente
              </p>
            </div>
          ) : (
            /* Wallet Existente */
            <div className="space-y-6">
              {/* QR Code - Siempre Visible */}
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    <CheckCircle size={16} />
                    Wallet Activa
                  </div>
                </div>
                
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-xl shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`} 
                      alt="QR Wallet"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                
                <p className="text-center text-xs text-gray-600">
                  Escanea el QR o copia la dirección
                </p>
              </div>

              {/* Dirección de Wallet */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="text-green-500" size={24} />
                  <h3 className="font-bold text-gray-200">Tu Dirección USDT (BEP20)</h3>
                </div>

                <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
                  <code className="text-sm text-green-400 break-all font-mono">
                    {walletAddress}
                  </code>
                </div>

                <button
                  onClick={handleCopyAddress}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    copySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle size={20} />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={20} />
                      Copiar Dirección
                    </>
                  )}
                </button>
              </div>

              {/* Información de Depósito */}
              <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-2xl p-6 border border-blue-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <ArrowDownToLine className="text-blue-400" size={24} />
                  <h3 className="font-bold text-lg text-gray-200">Cómo Depositar</h3>
                </div>

                <div className="space-y-4">
                  {/* Paso 1 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      1
                    </div>
                    <div>
                      <p className="text-gray-200 font-semibold text-sm">Copia tu dirección</p>
                      <p className="text-gray-400 text-xs">Usa el botón de arriba o escanea el QR</p>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      2
                    </div>
                    <div>
                      <p className="text-gray-200 font-semibold text-sm">Envía USDT desde otra wallet</p>
                      <p className="text-gray-400 text-xs">Binance, Trust Wallet, MetaMask, etc.</p>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      3
                    </div>
                    <div>
                      <p className="text-gray-200 font-semibold text-sm">Recibe automáticamente</p>
                      <p className="text-gray-400 text-xs">Tu saldo se acredita al confirmarse</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Especificaciones y Recomendaciones */}
              <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="text-purple-500" size={24} />
                  <h3 className="font-bold text-gray-200">Especificaciones</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-200 text-sm font-semibold">Red BSC (BEP20)</p>
                      <p className="text-gray-400 text-xs">Solo USDT en red Binance Smart Chain</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-200 text-sm font-semibold">Mínimo $0.50 USDT</p>
                      <p className="text-gray-400 text-xs">Cualquier cantidad superior a 0.5 USDT</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-gray-200 text-sm font-semibold">Acreditación Automática</p>
                      <p className="text-gray-400 text-xs">Sin intervención manual requerida</p>
                    </div>
                  </div>
                </div>

                {/* Recomendaciones */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="text-yellow-500" size={20} />
                    <h4 className="font-bold text-gray-200 text-sm">Recomendaciones</h4>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 text-sm">•</span>
                      <p className="text-gray-400 text-xs">
                        Verifica que estás enviando USDT en red <strong className="text-gray-300">BSC/BEP20</strong>
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 text-sm">•</span>
                      <p className="text-gray-400 text-xs">
                        Guarda tu dirección para futuros depósitos
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 text-sm">•</span>
                      <p className="text-gray-400 text-xs">
                        Las transacciones toman ~3-5 minutos en confirmarse
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-500 text-sm">•</span>
                      <p className="text-gray-400 text-xs">
                        No envíes desde exchanges que no soporten retiros a direcciones externas
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tiempo de Procesamiento */}
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-700/50">
                <div className="flex items-center gap-3">
                  <Clock className="text-green-400 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-green-200 font-semibold text-sm">
                      Procesamiento Automático
                    </p>
                    <p className="text-green-400/80 text-xs">
                      Tu depósito se acreditará automáticamente al confirmarse en la blockchain
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
