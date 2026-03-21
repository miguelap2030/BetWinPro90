import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { ArrowDownToLine, DollarSign, Wallet, CheckCircle, AlertCircle, Copy, QrCode, Loader2 } from 'lucide-react'
import { useProfile, useSignOut, useTronDealerWallet, useCreateTronDealerWalletDirect } from '../hooks/useQueries'
import { useQueryClient } from '@tanstack/react-query'
import QRCode from '../components/QRCode'

export default function Depositar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const { data: profileData } = useProfile(user?.id)
  const { data: trondealerWallet, isLoading: walletLoading, refetch: refetchWallet } = useTronDealerWallet(user?.id)
  const createWalletMutation = useCreateTronDealerWalletDirect()
  const signOutMutation = useSignOut()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profileData) setProfile(profileData)
  }, [profileData])

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

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
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateWallet = async () => {
    if (!user || !profile) return

    try {
      await createWalletMutation.mutateAsync({
        userId: user.id,
        username: profile.username || user.email.split('@')[0],
      })
      
      // Esperar un momento y recargar
      setTimeout(() => {
        refetchWallet()
      }, 2000)
    } catch (error) {
      console.error('Error al crear wallet:', error)
      alert('Error al crear wallet: ' + error.message)
    }
  }

  const handleCopyAddress = async () => {
    if (!trondealerWallet?.trondealer_address) return

    try {
      await navigator.clipboard.writeText(trondealerWallet.trondealer_address)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error al copiar:', error)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('Ingresa un monto válido')
      return
    }

    setProcessing(true)

    try {
      // 1. Crear transacción de depósito directamente
      const { error: transactionError } = await supabase.rpc('create_transaction', {
        p_user_id: user.id,
        p_type: 'deposit',
        p_amount: parseFloat(amount),
        p_description: `Depósito de $${parseFloat(amount).toFixed(2)}`,
        p_status: 'completed',
        p_reference: 'deposito_simulado'
      })

      if (transactionError) throw transactionError

      // 2. Actualizar wallet - sumar al saldo invertido (para pruebas)
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance_invertido: (wallet?.balance_invertido || 0) + parseFloat(amount),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (walletError) throw walletError

      // 3. Invalidar caché para actualizar UI
      queryClient.invalidateQueries({ queryKey: ['wallet', user.id] })
      queryClient.invalidateQueries({ queryKey: ['transactions', user.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', user.id] })

      alert(`✅ Depósito de $${parseFloat(amount).toFixed(2)} completado exitosamente`)
      navigate('/dashboard/panel')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar depósito: ' + error.message)
    } finally {
      setProcessing(false)
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

  const walletAddress = trondealerWallet?.trondealer_address || profile?.trondealer_address
  const walletLabel = trondealerWallet?.trondealer_label || profile?.trondealer_label

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profile} onSignOut={handleSignOut} />

      <main className="lg:ml-0 p-3 pt-20 pb-24">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="mb-4 text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-1">
              Depositar Fondos
            </h1>
            <p className="text-xs text-gray-400">USDT en red BSC (BEP20)</p>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 mb-4 shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs opacity-90">Saldo Invertido</p>
              <DollarSign size={16} className="opacity-75" />
            </div>
            <p className="text-3xl font-bold">${wallet?.balance_invertido?.toFixed(2) || '0.00'}</p>
          </div>

          {/* Wallet USDT Section */}
          <div className="bg-gray-800 rounded-xl p-4 mb-4 shadow-sm border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="text-green-500" size={20} />
              <h2 className="font-bold text-gray-200">Tu Wallet USDT (BEP20)</h2>
            </div>

            {walletLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-500" size={32} />
              </div>
            ) : walletAddress ? (
              <>
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <QRCode value={walletAddress} size={180} />
                </div>

                {/* Wallet Address */}
                <div className="bg-gray-900 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-green-400 break-all font-mono">
                      {walletAddress}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                      title="Copiar dirección"
                    >
                      {copySuccess ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <Copy size={18} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Copy Button */}
                <button
                  onClick={handleCopyAddress}
                  className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Copy size={16} />
                  {copySuccess ? '¡Copiado!' : 'Copiar dirección'}
                </button>

                {/* Info */}
                <div className="mt-4 bg-blue-900/30 rounded-lg p-3 border border-blue-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-blue-200">
                      <p className="font-semibold mb-1">Instrucciones:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-300">
                        <li>Copia tu dirección de wallet</li>
                        <li>Envía USDT desde otra wallet (red BSC/BEP20)</li>
                        <li>El saldo se acreditará automáticamente</li>
                        <li>Mínimo: $0.50 USDT</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Toggle QR */}
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full mt-3 py-2 px-4 bg-purple-900/50 hover:bg-purple-900 text-purple-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <QrCode size={16} />
                  {showQR ? 'Ocultar QR' : 'Mostrar QR'}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="mx-auto text-yellow-500 mb-3" size={32} />
                <p className="text-gray-300 text-sm mb-4">
                  No tienes una wallet USDT generada aún.
                </p>
                <button
                  onClick={handleGenerateWallet}
                  disabled={createWalletMutation.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {createWalletMutation.isPending ? 'Generando...' : 'Generar Wallet USDT'}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Se generará una dirección única para ti
                </p>
              </div>
            )}
          </div>

          {/* Depósito Simulado Section */}
          <div className="bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownToLine className="text-blue-500" size={20} />
              <h2 className="font-bold text-gray-200">Depósito Simulado (PRUEBAS)</h2>
            </div>

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Monto a Depositar (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-3 border-2 border-gray-700 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 text-lg font-bold"
                    step="0.01"
                    min="0.5"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Mínimo: $0.50</p>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAmount('50')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $50
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('100')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $100
                </button>
                <button
                  type="button"
                  onClick={() => setAmount('500')}
                  className="py-2 px-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700 rounded-lg text-sm font-semibold text-purple-300 transition-colors"
                >
                  $500
                </button>
              </div>

              {/* Success Info */}
              <div className="bg-green-900/30 rounded-xl p-3 border border-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-400 flex-shrink-0" size={16} />
                  <p className="text-xs text-green-800 font-medium">
                    Se acreditará inmediatamente
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/panel')}
                  className="flex-1 px-4 py-3 border-2 border-gray-600 text-gray-300 rounded-xl font-semibold hover:bg-gray-800/50 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all text-sm"
                >
                  {processing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
