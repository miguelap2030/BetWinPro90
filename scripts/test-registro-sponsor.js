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
  console.log('\n🧪 TEST DE REGISTRO CON SPONSOR\n')
  console.log('========================================\n')

  // 1. Primero verificar que existe un usuario con código de referido
  console.log('1️⃣ Buscando sponsor con referral_code F9AB085B (asa22@gmail.com)...\n')
  
  const { data: sponsorData, error: sponsorError } = await supabase
    .rpc('validate_referral_code', { p_referral_code: 'F9AB085B' })
    .maybeSingle()

  if (sponsorError) {
    console.log('❌ Error:', sponsorError.message)
    return
  }

  if (!sponsorData) {
    console.log('❌ No se encontró el sponsor')
    return
  }

  console.log('✅ Sponsor encontrado:')
  console.log('   ID:', sponsorData.id)
  console.log('   Username:', sponsorData.username)
  console.log('   Referral Code:', sponsorData.referral_code)
  console.log('')

  // 2. Crear usuario de prueba
  const testEmail = `test.sponsor.${Date.now()}@test.com`
  const testPassword = 'Test123!'
  
  console.log('2️⃣ Creando usuario de prueba:', testEmail)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  })

  if (authError) {
    console.log('❌ Error auth:', authError.message)
    return
  }

  const testUserId = authData.user.id
  console.log('   ✅ Usuario creado en auth:', testUserId)
  console.log('')

  // 3. Crear perfil con sponsor
  console.log('3️⃣ Creando perfil con sponsor_id...\n')
  
  const { error: profileError } = await supabase.rpc('create_user_profile', {
    p_user_id: testUserId,
    p_username: testEmail.split('@')[0],
    p_email: testEmail,
    p_sponsor_id: sponsorData.id,  // ✅ Pasamos el sponsor_id correctamente
    p_referral_code: null,
  })

  if (profileError) {
    console.log('❌ Error perfil:', profileError.message)
    console.log('   Details:', profileError.details)
    console.log('   Hint:', profileError.hint)
    
    // Limpiar usuario
    await supabase.auth.admin.deleteUser(testUserId)
    return
  }

  console.log('   ✅ Perfil creado')
  console.log('')

  // 4. Verificar perfil creado
  console.log('4️⃣ Verificando perfil creado:\n')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, username, email, referral_code, sponsor_id')
    .eq('user_id', testUserId)
    .single()

  if (!profile) {
    console.log('❌ Perfil no existe')
    await supabase.auth.admin.deleteUser(testUserId)
    return
  }

  console.log('   📋 Perfil:')
  console.log('      user_id:', profile.user_id)
  console.log('      username:', profile.username)
  console.log('      email:', profile.email)
  console.log('      referral_code:', profile.referral_code)
  console.log('      sponsor_id:', profile.sponsor_id)
  console.log('')

  // 5. Verificar si el sponsor_id es correcto
  if (profile.sponsor_id === sponsorData.id) {
    console.log('   ✅ ¡SPONSOR_ID CORRECTO! El sistema funciona.')
  } else {
    console.log('   ❌ SPONSOR_ID INCORRECTO')
    console.log('      Esperado:', sponsorData.id)
    console.log('      Obtenido:', profile.sponsor_id)
  }
  console.log('')

  // 6. Verificar árbol del sponsor
  console.log('5️⃣ Verificando árbol del sponsor (asa22@gmail.com):\n')
  
  const { data: tree } = await supabase
    .rpc('get_referrals_tree_recursive', { p_user_id: sponsorData.id })

  if (tree && tree.length > 0) {
    console.log(`   ✅ Sponsor tiene ${tree.length} referidos:`)
    tree.forEach((ref, i) => {
      const userData = ref.profiles || ref
      console.log(`      ${i + 1}. ${userData.email} (Nivel ${ref.level})`)
    })
  } else {
    console.log('   ⚠️ Sponsor sin referidos (puede ser correcto si es el primero)')
  }
  console.log('')

  // 7. Limpiar
  console.log('6️⃣ Limpiando usuario de prueba...')
  await supabase.auth.admin.deleteUser(testUserId)
  console.log('   ✅ Usuario eliminado')
  console.log('')

  console.log('========================================')
  console.log('✅ TEST COMPLETADO')
  console.log('========================================\n')
}

main().catch(console.error)
