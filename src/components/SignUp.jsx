import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useSignUp, useValidateReferralCode } from '../hooks/useQueries'
import { Mail, Lock, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react'

export default function SignUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // React Query hooks
  const signUpMutation = useSignUp()
  const validateReferralMutation = useValidateReferralCode()
  
  const [validatingCode, setValidatingCode] = useState(false)
  const [sponsorInfo, setSponsorInfo] = useState(null)

  // Leer parámetro 'ref' de la URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const refCode = params.get('ref')

    if (refCode) {
      setFormData(prev => ({
        ...prev,
        referralCode: refCode.toUpperCase()
      }))
    }
  }, [location.search])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Limpiar sponsor info cuando el usuario cambia el código
    if (e.target.name === 'referralCode') {
      setSponsorInfo(null)
    }
  }

  // Validar código de referido al momento de registrarse
  const validateReferralCode = async (code) => {
    const codigoNormalizado = code.toUpperCase().trim()
    setValidatingCode(true)

    try {
      const result = await validateReferralMutation.mutateAsync(codigoNormalizado)
      return result
    } catch (error) {
      console.error('Error validando código:', error)
      return null
    } finally {
      setValidatingCode(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    // Validar código de referido al momento de registrarse
    let sponsorData = null
    if (formData.referralCode && formData.referralCode.trim() !== '') {
      sponsorData = await validateReferralCode(formData.referralCode)

      // Si el código no existe, mostrar error y NO realizar el registro
      if (!sponsorData) {
        setError(`El código de referido "${formData.referralCode.toUpperCase()}" no existe. Verifica el código e inténtalo nuevamente.`)
        setLoading(false)
        return
      }

      setSponsorInfo({
        id: sponsorData.id,
        username: sponsorData.username,
        referral_code: sponsorData.referral_code
      })
    }

    try {
      await signUpMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        referralCode: formData.referralCode,
      })

      // Mensaje de éxito con información del sponsor si existe
      if (sponsorInfo) {
        setSuccess(`¡Cuenta creada exitosamente! Has sido referido por ${sponsorInfo.username}. Redirigiendo al login...`)
      } else {
        setSuccess('¡Cuenta creada exitosamente! Redirigiendo al login...')
      }

      setTimeout(() => {
        navigate('/signin')
      }, 2000)

    } catch (error) {
      console.error('Error en signUp:', error)
      setError(error.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-900/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-900/40 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-900/30 rounded-full blur-3xl animate-pulse delay-500" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg mb-4">
            <span className="text-4xl font-bold text-white">B</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            BetWinPro90
          </h1>
          <p className="text-gray-300 font-light">Crea tu cuenta gratuita</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 fade-in">
          <form onSubmit={handleSignUp} className="space-y-5">
            {error && (
              <div className="error-toast">
                <span className="text-lg">❌</span>
                {error}
              </div>
            )}

            {success && (
              <div className="success-toast">
                <CheckCircle size={20} className="text-green-400" />
                {success}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="elegant-label">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu.nombre@ejemplo.com"
                  className="glass-input pl-12"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="elegant-label">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="glass-input pl-12 pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="elegant-label">
                Repetir Contraseña
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="glass-input pl-12 pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <label htmlFor="referralCode" className="elegant-label">
                Código de Referido <span className="text-gray-400 font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <UserPlus size={20} />
                </div>
                <input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  value={formData.referralCode}
                  onChange={handleChange}
                  placeholder="Ej: A1B2C3D4"
                  className="glass-input pl-12 uppercase tracking-wider"
                  disabled={loading || validatingCode}
                />
                {/* Indicador de validación durante el registro */}
                {validatingCode && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
              <p className="helper-text">
                ¿Tienes un código? Úsalo para obtener beneficios del sistema MLM
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={signUpMutation.isPending}
              className="gradient-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {signUpMutation.isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear Cuenta
                  <CheckCircle size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer del formulario */}
          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600/50" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-800/50 backdrop-blur-sm text-gray-400">¿Ya tienes cuenta?</span>
              </div>
            </div>
            <p className="mt-4 text-gray-300">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/signin" className="glass-link">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 BetWinPro90. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
