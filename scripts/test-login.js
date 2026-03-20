import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Leer archivo .env manualmente
const envPath = resolve(__dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')

// Parsear variables de entorno
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY

console.log('🔗 Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
  const email = 'asa22@gmail.com'
  const password = '123456'

  console.log('\n🔐 Iniciando sesión con:', email)
  console.log('----------------------------------------')

  // 1. Iniciar sesión
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('❌ Error al iniciar sesión:', authError.message)
    return
  }

  const user = authData.user
  const session = authData.session

  console.log('\n✅ ¡Inicio de sesión exitoso!')
  console.log('\n📋 Datos del usuario:')
  console.log('   ID:', user.id)
  console.log('   Email:', user.email)
  console.log('   Last Sign In:', new Date(user.last_sign_in_at).toLocaleString())

  console.log('\n🔑 Token de acceso (access_token):')
  console.log('----------------------------------------')
  console.log(session.access_token)
  console.log('----------------------------------------')

  console.log('\n🔑 Refresh Token:')
  console.log('----------------------------------------')
  console.log(session.refresh_token)
  console.log('----------------------------------------')

  // 2. Obtener perfil del usuario
  console.log('\n👤 Obteniendo perfil...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('❌ Error al obtener perfil:', profileError.message)
  } else {
    console.log('\n📋 Perfil:')
    console.log('   Username:', profile.username)
    console.log('   Referral Code:', profile.referral_code)
    console.log('   Sponsor ID:', profile.sponsor_id)
    console.log('   Role:', profile.role)
  }

  // 3. Obtener referidos (igual que en Equipo.jsx)
  console.log('\n👥 Obteniendo árbol de referidos...')
  const { data: referrals, error: referralsError } = await supabase
    .rpc('get_referrals_tree_recursive', { p_user_id: user.id })

  if (referralsError) {
    console.error('❌ Error al obtener referidos:', referralsError.message)
  } else {
    console.log('\n✅ Referidos encontrados:', referrals?.length || 0)
    
    if (referrals && referrals.length > 0) {
      // Estadísticas por nivel
      const level1 = referrals.filter(r => r.level === 1)
      const level2 = referrals.filter(r => r.level === 2)
      const level3 = referrals.filter(r => r.level === 3)

      console.log('\n📊 Estadísticas:')
      console.log('   Nivel 1:', level1.length, 'referidos')
      console.log('   Nivel 2:', level2.length, 'referidos')
      console.log('   Nivel 3:', level3.length, 'referidos')

      console.log('\n📋 Lista detallada:')
      console.log('----------------------------------------')
      
      referrals.forEach((ref, index) => {
        const userData = ref.profiles || ref
        const balanceInvertido = userData.balance_invertido ?? ref.balance_invertido ?? 0
        const isActive = userData.is_active !== false
        
        console.log(`\n   [${index + 1}] Nivel ${ref.level}`)
        console.log('       Email:', userData.email || '---')
        console.log('       Username:', userData.username || '---')
        console.log('       Balance Invertido: $' + balanceInvertido.toFixed(2))
        console.log('       Estado:', isActive ? '✅ Activo' : '❌ Inactivo')
      })
    } else {
      console.log('   No tienes referidos aún.')
    }
  }

  // 4. Obtener wallet
  console.log('\n💰 Obteniendo wallet...')
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', user.id)
    .single()

  if (walletError) {
    console.error('❌ Error al obtener wallet:', walletError.message)
  } else {
    console.log('\n📋 Wallet:')
    console.log('   Balance Disponible: $' + (wallet?.balance_disponible || 0).toFixed(2))
    console.log('   Balance Invertido: $' + (wallet?.balance_invertido || 0).toFixed(2))
    console.log('   Ganancias Diarias: $' + (wallet?.profit_daily || 0).toFixed(2))
    console.log('   Total Comisiones: $' + (wallet?.total_commissions || 0).toFixed(2))
    console.log('   Total Retirado: $' + (wallet?.total_retirado || 0).toFixed(2))
  }

  console.log('\n----------------------------------------')
  console.log('✅ ¡Proceso completado!')
  console.log('----------------------------------------\n')
}

main().catch(console.error)
