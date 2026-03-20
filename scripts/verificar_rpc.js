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

// Usar service role key si existe para tener más permisos
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(
  envVars.VITE_SUPABASE_URL, 
  supabaseServiceKey || envVars.VITE_SUPABASE_ANON_KEY
)

async function main() {
  console.log('\n📋 OBTENIENDO DEFINICIÓN DE create_user_profile\n')

  // Consultar la definición de la función desde pg_proc
  const { data: functions, error } = await supabase
    .rpc('get_function_definition', { p_function_name: 'create_user_profile' })

  if (error) {
    console.log('❌ Error obteniendo función:', error.message)
    console.log('\nIntentando alternativa...')
  }

  // Alternativa: buscar en information_schema
  const { data: routines } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_definition, routine_type')
    .eq('routine_name', 'create_user_profile')

  if (routines && routines.length > 0) {
    console.log('✅ Función encontrada:')
    console.log(routines[0].routine_definition)
  } else {
    console.log('❌ No se pudo obtener la definición')
  }

  // Verificar si la función existe
  console.log('\n\n🔍 Probando llamada a create_user_profile con usuario de prueba...\n')
  
  // Crear usuario temporal para test
  const testEmail = `test.${Date.now()}@test.com`
  const testPassword = 'Test123!'
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  })

  if (authError) {
    console.log('❌ Error creando usuario test:', authError.message)
    return
  }

  const testUserId = authData.user.id
  console.log('✅ Usuario test creado:', testUserId)

  // Llamar a la función RPC
  console.log('\n📞 Llamando a create_user_profile...')
  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_user_profile', {
    p_user_id: testUserId,
    p_username: 'testuser',
    p_email: testEmail,
    p_sponsor_id: null,
    p_referral_code: 'TEST123',
  })

  if (rpcError) {
    console.log('❌ Error RPC:', rpcError.message)
    console.log('   Details:', rpcError.details)
    console.log('   Hint:', rpcError.hint)
  } else {
    console.log('✅ RPC exitoso')
    console.log('   Result:', rpcResult)
  }

  // Verificar perfil creado
  console.log('\n📋 Verificando perfil creado:')
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, username, email, referral_code, sponsor_id')
    .eq('user_id', testUserId)
    .single()

  if (profile) {
    console.log('   ✅ Perfil creado:')
    console.log('      user_id:', profile.user_id)
    console.log('      username:', profile.username)
    console.log('      email:', profile.email)
    console.log('      referral_code:', profile.referral_code)
    console.log('      sponsor_id:', profile.sponsor_id)
  } else {
    console.log('   ❌ Perfil NO creado')
  }

  // Eliminar usuario test
  console.log('\n🗑️ Limpiando usuario test...')
  await supabase.auth.admin.deleteUser(testUserId)
  console.log('   ✅ Usuario eliminado')
}

main().catch(console.error)
