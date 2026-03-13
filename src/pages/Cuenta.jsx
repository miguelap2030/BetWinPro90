import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { useProfile, useWallet, useSignOut } from '../hooks/useQueries'
import {
  UserCircle,
  Mail,
  Shield,
  Key,
  Wallet,
  Copy,
  Check,
  Save,
  Bell,
  Moon,
  Globe,
  Lock,
  LogOut,
  UserPlus,
  Award,
  Calendar,
  Edit2
} from 'lucide-react'

export default function Cuenta() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    wallet_address: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

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
  const { data: walletData } = useWallet(user?.id)
  const signOutMutation = useSignOut()

  // Actualizar formData cuando profileData cambie
  useEffect(() => {
    if (profileData) {
      setFormData({
        username: profileData?.username || '',
        email: profileData?.email || '',
        wallet_address: profileData?.wallet_address || '',
      })
    }
  }, [profileData])

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync()
    navigate('/signin')
  }

  const copyReferralLink = async () => {
    if (!profileData?.referral_code) return

    const referralLink = `${window.location.origin}/signup?ref=${profileData.referral_code}`

    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showMessage('success', 'Link copiado al portapapeles')
    } catch (error) {
      console.error('Error al copiar:', error)
    }
  }

  const copyReferralCode = async () => {
    if (!profileData?.referral_code) return

    try {
      await navigator.clipboard.writeText(profileData.referral_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showMessage('success', 'Código copiado al portapapeles')
    } catch (error) {
      console.error('Error al copiar:', error)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const handleSaveProfile = async () => {
    setSaving(true)

    try {
      // Actualizar perfil usando RPC
      const { error } = await supabase.rpc('update_user_profile', {
        p_user_id: user.id,
        p_username: formData.username,
        p_wallet_address: formData.wallet_address,
      })

      if (error) throw error

      showMessage('success', 'Perfil actualizado correctamente')
      setEditing(false)

      // Recargar datos
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)
    } catch (error) {
      console.error('Error al guardar:', error)
      showMessage('error', 'Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'Las contraseñas no coinciden')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      showMessage('success', 'Contraseña actualizada correctamente')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error) {
      console.error('Error al cambiar contraseña:', error)
      showMessage('error', error.message || 'Error al cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-300">Cargando cuenta...</p>
        </div>
      </div>
    )
  }

  const referralLink = profileData?.referral_code
    ? `${window.location.origin}/signup?ref=${profileData.referral_code}`
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900">
      <Sidebar user={user} profile={profileData} onSignOut={handleSignOut} />

      {/* Main Content */}
      <main className="lg:ml-72 p-4 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Mi Cuenta
          </h1>
          <p className="text-gray-400">Gestiona tu perfil y configuración</p>
        </div>

        {/* Message Toast */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-300 border-2 border-green-700' 
              : 'bg-red-100 text-red-700 border-2 border-red-700'
          }`}>
            {message.type === 'success' ? <Check size={20} /> : <Lock size={20} />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                  <UserCircle className="text-purple-400" size={24} />
                  Información de Perfil
                </h2>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <Edit2 size={16} />
                  {editing ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de Usuario
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={!editing}
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none ${
                        editing 
                          ? 'border-gray-700 focus:border-purple-500 bg-white' 
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-700 bg-gray-800/50 rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Wallet Address (Para retiros)
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="wallet_address"
                      value={formData.wallet_address}
                      onChange={handleInputChange}
                      disabled={!editing}
                      placeholder="Tu dirección de wallet para retiros"
                      className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none ${
                        editing 
                          ? 'border-gray-700 focus:border-purple-500 bg-white' 
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                    />
                  </div>
                </div>

                {editing && (
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <Save size={20} />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                )}
              </div>
            </div>

            {/* Change Password */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-6">
                <Shield className="text-purple-400" size={24} />
                Cambiar Contraseña
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-700 rounded-xl focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Lock size={20} />
                  {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Referral Info */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-6">
                <UserPlus className="text-pink-400" size={24} />
                Tu Referido
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tu Código
                  </label>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-3 rounded-xl">
                    <Award className="text-purple-400 flex-shrink-0" size={20} />
                    <span className="font-bold text-purple-300 text-lg flex-1 text-center">
                      {profileData?.referral_code || '---'}
                    </span>
                    <button
                      onClick={copyReferralCode}
                      className="hover:text-purple-900 transition-colors"
                    >
                      {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Link de Referido
                  </label>
                  <div className="bg-gray-800 border-2 border-purple-700 rounded-xl p-3 mb-3">
                    <code className="text-xs text-gray-400 break-all">
                      {referralLink || 'Generando...'}
                    </code>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <Copy size={20} />
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-6">
                <Calendar className="text-purple-400" size={24} />
                Estadísticas
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Miembro desde</span>
                  <span className="font-semibold text-gray-200">
                    {profileData?.created_at
                      ? new Date(profileData.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long'
                        })
                      : '---'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-400">Estado</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    profileData?.is_active
                      ? 'bg-green-100 text-green-300'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {profileData?.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-400">ID de Usuario</span>
                  <span className="font-mono text-xs text-gray-400 max-w-[150px] truncate">
                    {user?.id?.substring(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Summary */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2 mb-6">
                <Wallet className="text-green-400" size={24} />
                Resumen Wallet
              </h2>

              <div className="space-y-3">
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Disponible</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${walletData?.balance_disponible?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Invertido</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${walletData?.balance_invertido?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Retirado</p>
                  <p className="text-xl font-bold text-yellow-400">
                    ${walletData?.total_retirado?.toFixed(2) || '0.00'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Comisiones</p>
                  <p className="text-xl font-bold text-pink-400">
                    ${walletData?.total_comisiones?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
