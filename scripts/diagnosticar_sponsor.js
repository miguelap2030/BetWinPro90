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
  console.log('\n📊 DIAGNÓSTICO DE SPONSOR_ID EN PERFILES\n')
  console.log('========================================\n')

  // 1. Verificar todos los perfiles y sus sponsor_id
  console.log('1️⃣ Todos los perfiles con su sponsor_id:\n')
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, username, referral_code, sponsor_id, created_at')
    .order('created_at', { ascending: true })

  if (profilesError) {
    console.error('❌ Error:', profilesError.message)
    return
  }

  console.log('┌─────┬────────────────────────────┬──────────────┬──────────────┬──────────────┬─────────────────────┐')
  console.log('│ #   │ Email                      │ Username     │ Ref Code     │ Sponsor ID   │ Created At          │')
  console.log('├─────┼────────────────────────────┼──────────────┼──────────────┼──────────────┼─────────────────────┤')

  profiles.forEach((p, i) => {
    const num = (i + 1).toString().padStart(3)
    const email = p.email.substring(0, 26).padEnd(26)
    const username = (p.username || '---').padEnd(12)
    const refCode = (p.referral_code || '---').padEnd(12)
    const sponsorId = p.sponsor_id ? '✅ ' + p.sponsor_id.substring(0, 8) + '...' : '❌ NULL'
    const created = new Date(p.created_at).toLocaleString('es-ES').padEnd(19)
    
    console.log(`│ ${num} │ ${email} │ ${username} │ ${refCode} │ ${sponsorId.padEnd(12)} │ ${created} │`)
  })
  
  console.log('└─────┴────────────────────────────┴──────────────┴──────────────┴──────────────┴─────────────────────┘\n')

  // 2. Verificar usuarios con sponsor_id NULL que deberían tener sponsor
  console.log('2️⃣ Perfiles SIN sponsor_id (posible problema):\n')
  
  const withoutSponsor = profiles.filter(p => p.sponsor_id === null)
  
  if (withoutSponsor.length === 0) {
    console.log('   ✅ Todos los perfiles tienen sponsor_id\n')
  } else {
    console.log(`   ⚠️ ${withoutSponsor.length} perfiles sin sponsor_id:\n`)
    withoutSponsor.forEach(p => {
      console.log(`   - ${p.email} (${p.username}) - Ref: ${p.referral_code}`)
    })
    console.log('')
  }

  // 3. Verificar estructura de la función create_user_profile
  console.log('3️⃣ Verificando función RPC create_user_profile:\n')
  
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('create_user_profile', {
      p_user_id: null,
      p_username: 'test',
      p_email: 'test@test.com',
      p_sponsor_id: null,
      p_referral_code: null
    })

  if (rpcError) {
    console.log('   ⚠️ Error al llamar RPC (posiblemente no existe o requiere parámetros válidos)')
    console.log('   Error:', rpcError.message)
  } else {
    console.log('   ✅ Función RPC existe')
  }
  console.log('')

  // 4. Mostrar estructura esperada del árbol MLM
  console.log('4️⃣ Árbores MLM detectados:\n')
  
  // Buscar raíces (usuarios sin sponsor)
  const roots = profiles.filter(p => p.sponsor_id === null)
  
  for (const root of roots) {
    console.log(`   🌳 Raíz: ${root.username} (${root.email})`)
    
    // Buscar referidos directos de esta raíz
    const directReferrals = profiles.filter(p => p.sponsor_id === root.id)
    
    if (directReferrals.length > 0) {
      console.log(`      └─ ${directReferrals.length} referidos directos`)
      
      // Mostrar primeros 3
      directReferrals.slice(0, 3).forEach(r => {
        console.log(`         ├─ ${r.username} (${r.email})`)
        
        // Buscar nivel 2
        const level2 = profiles.filter(p => p.sponsor_id === r.id)
        if (level2.length > 0) {
          level2.slice(0, 2).forEach(l2 => {
            console.log(`            └─ ${l2.username} (${l2.email})`)
            
            // Buscar nivel 3
            const level3 = profiles.filter(p => p.sponsor_id === l2.id)
            if (level3.length > 0) {
              level3.slice(0, 1).forEach(l3 => {
                console.log(`               └─ ${l3.username} (${l3.email})`)
              })
            }
          })
        }
      })
      
      if (directReferrals.length > 3) {
        console.log(`         └─ ... y ${directReferrals.length - 3} más`)
      }
    } else {
      console.log(`      └─ ❌ Sin referidos`)
    }
    console.log('')
  }

  // 5. Conclusión
  console.log('5️⃣ CONCLUSIÓN:\n')
  
  const totalProfiles = profiles.length
  const withoutSponsorCount = withoutSponsor.length
  const withSponsorCount = totalProfiles - withoutSponsorCount
  
  console.log(`   Total de perfiles: ${totalProfiles}`)
  console.log(`   Con sponsor_id: ${withSponsorCount}`)
  console.log(`   Sin sponsor_id: ${withoutSponsorCount}`)
  console.log('')
  
  if (withoutSponsorCount > 1) {
    console.log('   ⚠️ ALERTA: Hay múltiples usuarios sin sponsor_id')
    console.log('   Esto puede indicar que el registro no está guardando correctamente el sponsor_id')
    console.log('')
    console.log('   Posible causa: La función create_user_profile no está recibiendo el sponsor_id correcto')
  } else if (withoutSponsorCount === 1) {
    console.log('   ✅ Solo hay 1 usuario sin sponsor (el usuario raíz), lo cual es correcto')
  } else {
    console.log('   ✅ Todos los usuarios tienen sponsor_id')
  }
  
  console.log('\n========================================\n')
}

main().catch(console.error)
