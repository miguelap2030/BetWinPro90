import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = resolve(__dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('\n🔍 VERIFICANDO USUARIO asa22@gmail.com\n')

  // 1. Iniciar sesión
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'asa22@gmail.com',
    password: '123456',
  })

  if (authError) {
    console.error('❌ Error login:', authError.message)
    return
  }

  const userId = authData.user.id
  console.log('✅ User ID:', userId)

  // 2. Verificar si existe en auth.users
  console.log('\n📋 auth.users:')
  console.log('   Email:', authData.user.email)
  console.log('   Created:', new Date(authData.user.created_at).toLocaleString())

  // 3. Verificar si existe en profiles
  console.log('\n📋 profiles:')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    console.log('   ❌ NO existe en profiles')
    console.log('   Error:', profileError.message)
  } else {
    console.log('   ✅ Existe en profiles')
    console.log('   Username:', profile.username)
    console.log('   Referral Code:', profile.referral_code)
    console.log('   Sponsor ID:', profile.sponsor_id)
  }

  // 4. Verificar wallets
  console.log('\n📋 wallets:')
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (walletError) {
    console.log('   ❌ NO existe en wallets')
  } else {
    console.log('   ✅ Existe en wallets')
    console.log('   Balance:', wallet.balance_disponible)
  }

  // 5. Intentar crear perfil manualmente
  console.log('\n🔧 Intentando crear perfil manualmente con RPC...')
  
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
    p_user_id: userId,
    p_username: 'asa22',
    p_email: 'asa22@gmail.com',
    p_sponsor_id: null,
    p_referral_code: 'ASA22TEST',
  })

  if (rpcError) {
    console.log('   ❌ Error RPC:', rpcError.message)
  } else {
    console.log('   ✅ Perfil creado con RPC')
  }

  // 6. Verificar nuevamente
  console.log('\n📋 Verificando perfil después de RPC:')
  const { data: profile2 } = await supabase
    .from('profiles')
    .select('id, username, referral_code, sponsor_id')
    .eq('id', userId)
    .single()

  if (profile2) {
    console.log('   ✅ Perfil existe:')
    console.log('      Username:', profile2.username)
    console.log('      Referral Code:', profile2.referral_code)
    console.log('      Sponsor ID:', profile2.sponsor_id)
  } else {
    console.log('   ❌ Perfil NO existe')
  }
}

main().catch(console.error)
