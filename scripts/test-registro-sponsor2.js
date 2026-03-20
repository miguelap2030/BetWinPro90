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

// Usar service role para tener permisos completos
const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('\n🧪 TEST COMPLETO DE REGISTRO CON SPONSOR\n')
  console.log('========================================\n')

  // 1. Verificar sponsor
  console.log('1️⃣ Buscando sponsor (F9AB085B - asa22)...\n')
  
  const { data: sponsorData } = await supabase
    .rpc('validate_referral_code', { p_referral_code: 'F9AB085B' })
    .maybeSingle()

  if (!sponsorData) {
    console.log('❌ No se encontró sponsor')
    return
  }

  console.log('✅ Sponsor:', sponsorData.username, 'ID:', sponsorData.id)
  console.log('')

  // 2. Crear usuario
  const testEmail = `test.sponsor2.${Date.now()}@test.com`
  console.log('2️⃣ Creando usuario:', testEmail)
  
  const { data: authData } = await supabase.auth.signUp({
    email: testEmail,
    password: 'Test123!',
  })

  if (!authData?.user) {
    console.log('❌ Error creando usuario')
    return
  }

  const userId = authData.user.id
  console.log('   User ID:', userId)
  console.log('')

  // 3. Crear perfil con RPC
  console.log('3️⃣ Creando perfil con create_user_profile...\n')
  
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
    p_user_id: userId,
    p_username: testEmail.split('@')[0],
    p_email: testEmail,
    p_sponsor_id: sponsorData.id,
    p_referral_code: null,
  })

  if (rpcError) {
    console.log('❌ Error RPC:', rpcError.message)
    console.log('   Details:', rpcError.details)
    await supabase.auth.admin.deleteUser(userId)
    return
  }

  console.log('   ✅ RPC completado')
  console.log('   Result:', rpcResult)
  console.log('')

  // 4. Verificar con service role
  console.log('4️⃣ Verificando perfil (con service role)...\n')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, username, email, referral_code, sponsor_id')
    .eq('user_id', userId)
    .single()

  if (profile) {
    console.log('   ✅ Perfil encontrado:')
    console.log('      id:', profile.id)
    console.log('      user_id:', profile.user_id)
    console.log('      username:', profile.username)
    console.log('      email:', profile.email)
    console.log('      referral_code:', profile.referral_code)
    console.log('      sponsor_id:', profile.sponsor_id)
    console.log('')
    
    if (profile.sponsor_id === sponsorData.id) {
      console.log('   ✅ ¡SPONSOR_ID CORRECTO!')
    } else {
      console.log('   ❌ SPONSOR_ID INCORRECTO')
    }
  } else {
    console.log('   ❌ Perfil NO encontrado')
  }
  console.log('')

  // 5. Verificar árbol del sponsor
  console.log('5️⃣ Verificando árbol del sponsor:\n')
  
  const { data: tree } = await supabase
    .rpc('get_referrals_tree_recursive', { p_user_id: sponsorData.id })

  if (tree && tree.length > 0) {
    console.log(`   ✅ Sponsor tiene ${tree.length} referidos:`)
    const nuevoUsuario = tree.find(r => (r.profiles?.email || r.email) === testEmail)
    if (nuevoUsuario) {
      console.log('   ✅ ¡Nuevo usuario encontrado en el árbol!')
      console.log('      Email:', nuevoUsuario.profiles?.email || nuevoUsuario.email)
      console.log('      Nivel:', nuevoUsuario.level)
    }
  } else {
    console.log('   ⚠️ Sin referidos')
  }
  console.log('')

  // 6. Limpiar
  console.log('6️⃣ Limpiando...')
  await supabase.auth.admin.deleteUser(userId)
  console.log('   ✅ Usuario eliminado')
  console.log('')

  console.log('========================================')
  console.log('✅ TEST COMPLETADO')
  console.log('========================================\n')
}

main().catch(console.error)
