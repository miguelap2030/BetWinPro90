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
  console.log('\n🧪 TEST FINAL - VERIFICACIÓN DE REFERIDOS\n')
  console.log('========================================\n')

  // 1. Iniciar sesión con asa22
  console.log('1️⃣ Iniciando sesión con asa22@gmail.com...\n')
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'asa22@gmail.com',
    password: '123456',
  })

  if (authError) {
    console.log('❌ Error login:', authError.message)
    return
  }

  const userId = authData.user.id
  console.log('✅ Login exitoso')
  console.log('   User ID:', userId)
  console.log('')

  // 2. Obtener referidos con la nueva función RPC
  console.log('2️⃣ Obteniendo referidos con get_referrals_tree_recursive...\n')
  
  const { data: referrals, error: rpcError } = await supabase
    .rpc('get_referrals_tree_recursive', { p_user_id: userId })

  if (rpcError) {
    console.log('❌ Error RPC:', rpcError.message)
    return
  }

  if (!referrals || referrals.length === 0) {
    console.log('⚠️ No hay referidos aún')
  } else {
    console.log(`✅ ${referrals.length} referidos encontrados:\n`)
    
    // Agrupar por nivel
    const level1 = referrals.filter(r => r.level === 1)
    const level2 = referrals.filter(r => r.level === 2)
    const level3 = referrals.filter(r => r.level === 3)

    console.log('   📊 Estadísticas:')
    console.log(`      Nivel 1: ${level1.length}`)
    console.log(`      Nivel 2: ${level2.length}`)
    console.log(`      Nivel 3: ${level3.length}`)
    console.log('')

    console.log('   📋 Lista detallada:')
    referrals.forEach((ref, i) => {
      console.log(`\n      [${i + 1}] Nivel ${ref.level}`)
      console.log(`          Email: ${ref.email}`)
      console.log(`          Username: ${ref.username}`)
      console.log(`          Balance Invertido: $${ref.balance_invertido}`)
      console.log(`          Is Active: ${ref.is_active ? '✅' : '❌'}`)
      console.log(`          Joined: ${new Date(ref.joined_date).toLocaleString()}`)
    })
  }
  console.log('')

  // 3. Verificar formato de datos para el frontend
  console.log('3️⃣ Verificando formato de datos para el frontend...\n')
  
  if (referrals && referrals.length > 0) {
    const firstRef = referrals[0]
    console.log('   Primer referido (formato RPC):')
    console.log('      referred_id:', firstRef.referred_id)
    console.log('      email:', firstRef.email)
    console.log('      username:', firstRef.username)
    console.log('      level:', firstRef.level)
    console.log('      balance_invertido:', firstRef.balance_invertido)
    console.log('      is_active:', firstRef.is_active)
    console.log('')
    
    // Simular cómo lo usa el frontend
    const balanceInvertido = firstRef.balance_invertido ?? 0
    const isActive = firstRef.is_active !== false
    
    console.log('   ✅ Frontend puede acceder directamente a:')
    console.log('      referral.email:', firstRef.email)
    console.log('      referral.balance_invertido:', balanceInvertido)
    console.log('      referral.is_active:', isActive)
  }
  console.log('')

  console.log('========================================')
  console.log('✅ TEST COMPLETADO')
  console.log('========================================\n')
}

main().catch(console.error)
