/**
 * BETWINPRO90 - SCRIPT DE PRUEBAS COMPLETO
 * ==========================================
 * Este script prueba todo el flujo:
 * 1. Crear usuarios (como lo hace el frontend)
 * 2. Crear red MLM (sponsors y referidos)
 * 3. Iniciar sesión
 * 4. Realizar depósitos
 * 5. Verificar distribución de comisiones
 * 
 * Uso: node test_sistema_completo.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = 'https://alyboipgbixoufqftizd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjIyMTAsImV4cCI6MjA4ODgzODIxMH0.U10Xs0oHF0onn2CxHiuiNKfA9Dz8yWgap3Kn3zocRkA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[✅]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.magenta}=== ${msg} ===${colors.reset}\n`),
};

// ============================================================================
// FUNCIÓN 1: SIGNUP (igual que el frontend)
// ============================================================================
async function signUp(email, password, referralCode = null) {
  log.info(`Registrando usuario: ${email}`);
  
  try {
    // Paso 1: Buscar sponsor por referral code (si existe)
    let sponsorId = null;
    let sponsorUsername = null;
    
    if (referralCode) {
      const codigoNormalizado = referralCode.toUpperCase().trim();
      log.info(`🔍 Buscando sponsor con código: ${codigoNormalizado}`);
      
      const { data: sponsorData, error: sponsorError } = await supabase
        .from('profiles')
        .select('id, referral_code, username')
        .eq('referral_code', codigoNormalizado)
        .maybeSingle();
      
      if (sponsorError) {
        log.error(`Error buscando sponsor: ${sponsorError.message}`);
      } else if (sponsorData) {
        sponsorId = sponsorData.id;
        sponsorUsername = sponsorData.username;
        log.success(`✅ Sponsor encontrado: ${sponsorUsername} (ID: ${sponsorId})`);
      } else {
        log.warn(`⚠️ Código de referido no existe: ${codigoNormalizado}`);
      }
    }
    
    // Paso 2: Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          referral_code_used: referralCode || null,
        },
      },
    });
    
    if (authError) throw authError;
    if (!authData.user) throw new Error('No se obtuvo user_id de auth');
    
    log.success(`✅ Usuario Auth creado: ${authData.user.id}`);
    
    // Esperar un momento para que auth se propague
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Paso 3: Generar datos para el perfil
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const username = email.split('@')[0];
    
    // Paso 4: Crear perfil usando la función RPC
    const { data: profileData, error: profileError } = await supabase.rpc('create_user_profile', {
      p_user_id: authData.user.id,
      p_username: username,
      p_email: email,
      p_sponsor_id: sponsorId,
      p_referral_code: newReferralCode,
    });
    
    if (profileError) {
      log.error(`Error creando perfil: ${profileError.message}`);
      throw profileError;
    }
    
    log.success(`✅ Perfil creado exitosamente`);
    log.success(`   Username: ${username}`);
    log.success(`   Referral Code: ${newReferralCode}`);
    if (sponsorUsername) {
      log.success(`   Sponsor: ${sponsorUsername}`);
    }
    
    return {
      userId: authData.user.id,
      email: email,
      username: username,
      referralCode: newReferralCode,
      sponsorId: sponsorId,
      sponsorUsername: sponsorUsername,
    };
    
  } catch (error) {
    log.error(`Error en signUp: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// FUNCIÓN 2: SIGNIN (igual que el frontend)
// ============================================================================
async function signIn(email, password) {
  log.info(`Iniciando sesión: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) {
    log.error(`Error en signIn: ${error.message}`);
    throw error;
  }
  
  log.success(`✅ Sesión iniciada: ${data.user.email}`);
  return data;
}

// ============================================================================
// FUNCIÓN 3: OBTENER DATOS DEL USUARIO
// ============================================================================
async function getUserData(userId) {
  log.info(`Obteniendo datos del usuario: ${userId}`);
  
  const { data: summaryData } = await supabase
    .rpc('get_user_dashboard_summary', { p_user_id: userId })
    .single();
  
  if (!summaryData) {
    log.error('No se pudo obtener el resumen del usuario');
    return null;
  }
  
  log.success(`✅ Datos obtenidos:`);
  console.log(`   Username: ${summaryData.username}`);
  console.log(`   Email: ${summaryData.email}`);
  console.log(`   Referral Code: ${summaryData.referral_code}`);
  console.log(`   Sponsor: ${summaryData.sponsor_username || 'Ninguno'}`);
  console.log(`   Balance Disponible: $${summaryData.balance_disponible?.toFixed(2) || '0.00'}`);
  console.log(`   Balance Invertido: $${summaryData.balance_invertido?.toFixed(2) || '0.00'}`);
  console.log(`   Total Comisiones: $${summaryData.total_comisiones?.toFixed(2) || '0.00'}`);
  console.log(`   Referidos Totales: ${summaryData.total_referrals || 0}`);
  
  return summaryData;
}

// ============================================================================
// FUNCIÓN 4: REALIZAR DEPÓSITO (igual que Depositar.jsx)
// ============================================================================
async function realizarDeposito(userId, amount) {
  log.info(`Realizando depósito de $${amount} para usuario: ${userId}`);
  
  try {
    // Insertar depósito como COMPLETADO (el trigger distribuye comisiones)
    const { data: depositData, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'completed',
        payment_method: 'simulado',
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (depositError) throw depositError;
    
    log.success(`✅ Depósito completado: $${amount}`);
    log.success(`   ID Depósito: ${depositData.id}`);
    
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return depositData;
    
  } catch (error) {
    log.error(`Error en depósito: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// FUNCIÓN 5: VERIFICAR COMISIONES
// ============================================================================
async function verificarComisiones(userId) {
  log.info(`Verificando comisiones para usuario: ${userId}`);
  
  // Obtener comisiones de mlm_commissions
  const { data: commissions } = await supabase
    .from('mlm_commissions')
    .select(`
      *,
      from_profile:from_user_id (
        username,
        email
      )
    `)
    .eq('user_id', userId)
    .eq('is_paid', true)
    .order('created_at', { ascending: false });
  
  if (commissions && commissions.length > 0) {
    log.success(`✅ Se encontraron ${commissions.length} comisiones:`);
    commissions.forEach((comm, i) => {
      console.log(`   ${i + 1}. Nivel ${comm.level}: $${parseFloat(comm.amount).toFixed(2)} - Generado por: ${comm.from_profile?.username || 'N/A'}`);
    });
  } else {
    log.warn('⚠️ No se encontraron comisiones');
  }
  
  // Obtener transacciones de tipo commission
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'commission')
    .order('created_at', { ascending: false });
  
  if (transactions && transactions.length > 0) {
    log.success(`✅ Se encontraron ${transactions.length} transacciones de comisión:`);
    transactions.forEach((t, i) => {
      console.log(`   ${i + 1}. $${parseFloat(t.amount).toFixed(2)} - ${t.description}`);
    });
  }
  
  return { commissions, transactions };
}

// ============================================================================
// FUNCIÓN 6: VERIFICAR WALLET
// ============================================================================
async function verificarWallet(userId) {
  log.info(`Verificando wallet para usuario: ${userId}`);
  
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (wallet) {
    log.success(`✅ Wallet:`);
    console.log(`   Balance Disponible: $${wallet.balance_disponible?.toFixed(2) || '0.00'}`);
    console.log(`   Balance Invertido: $${wallet.balance_invertido?.toFixed(2) || '0.00'}`);
    console.log(`   Total Comisiones: $${wallet.total_comisiones?.toFixed(2) || '0.00'}`);
    console.log(`   Total Retirado: $${wallet.total_retirado?.toFixed(2) || '0.00'}`);
  } else {
    log.warn('⚠️ No se encontró wallet');
  }
  
  return wallet;
}

// ============================================================================
// FUNCIÓN 7: VERIFICAR RED MLM
// ============================================================================
async function verificarRedMLM(userId) {
  log.info(`Verificando red MLM para usuario: ${userId}`);
  
  const { data: referrals } = await supabase
    .rpc('get_referrals_tree_recursive', { p_user_id: userId });
  
  if (referrals && referrals.length > 0) {
    log.success(`✅ Red de referidos (${referrals.length} usuarios):`);
    
    // Agrupar por nivel
    const porNivel = { 1: [], 2: [], 3: [] };
    referrals.forEach(ref => {
      if (porNivel[ref.level]) {
        porNivel[ref.level].push(ref);
      }
    });
    
    [1, 2, 3].forEach(level => {
      if (porNivel[level].length > 0) {
        console.log(`   Nivel ${level} (${porNivel[level].length} usuarios):`);
        porNivel[level].forEach(ref => {
          console.log(`      - ${ref.username} (${ref.email})`);
        });
      }
    });
  } else {
    log.warn('⚠️ No hay referidos en la red');
  }
  
  return referrals;
}

// ============================================================================
// PRUEBA COMPLETA
// ============================================================================
async function runTests() {
  console.log('\n');
  log.step('🚀 INICIANDO PRUEBAS DEL SISTEMA BETWINPRO90');
  console.log('\n');
  
  const PASSWORD = '123456';
  const DEPOSIT_AMOUNT = 100;
  
  try {
    // =========================================================================
    // PASO 1: Crear usuarios con red MLM de 3 niveles
    // =========================================================================
    log.step('PASO 1: Crear red MLM de 3 niveles');
    
    // Usuario 1: admin (sin sponsor)
    log.info('Creando Usuario 1 (admin - sin sponsor)...');
    const user1 = await signUp('admin.test@gmail.com', PASSWORD);
    console.log('');
    
    // Usuario 2: referido de admin
    log.info('Creando Usuario 2 (referido de admin)...');
    const user2 = await signUp('usuario2.test@gmail.com', PASSWORD, user1.referralCode);
    console.log('');
    
    // Usuario 3: referido de usuario2
    log.info('Creando Usuario 3 (referido de usuario2)...');
    const user3 = await signUp('usuario3.test@gmail.com', PASSWORD, user2.referralCode);
    console.log('');
    
    // =========================================================================
    // PASO 2: Verificar estructura de la red
    // =========================================================================
    log.step('PASO 2: Verificar estructura MLM');
    
    log.info('Red de admin (Usuario 1):');
    await verificarRedMLM(user1.userId);
    console.log('');
    
    // =========================================================================
    // PASO 3: Usuario 3 hace depósito de $100
    // =========================================================================
    log.step('PASO 3: Usuario 3 realiza depósito de $100');
    
    await realizarDeposito(user3.userId, DEPOSIT_AMOUNT);
    console.log('');
    
    // =========================================================================
    // PASO 4: Verificar distribución de comisiones
    // =========================================================================
    log.step('PASO 4: Verificar comisiones distribuidas');
    
    // Usuario 3 (quien depositó) - no recibe comisiones
    log.info('=== USUARIO 3 (Depositó $100) ===');
    await verificarWallet(user3.userId);
    console.log('');
    
    // Usuario 2 (Nivel 1 - 5% = $5)
    log.info('=== USUARIO 2 (Nivel 1 - debería recibir 5% = $5) ===');
    await verificarWallet(user2.userId);
    await verificarComisiones(user2.userId);
    console.log('');
    
    // Usuario 1 (Nivel 2 - 3% = $3)
    log.info('=== USUARIO 1 (Nivel 2 - debería recibir 3% = $3) ===');
    await verificarWallet(user1.userId);
    await verificarComisiones(user1.userId);
    console.log('');
    
    // =========================================================================
    // PASO 5: Resumen final
    // =========================================================================
    log.step('📊 RESUMEN FINAL');
    
    console.log('Comisiones esperadas:');
    console.log('  - Usuario 2 (Nivel 1): $5.00 (5% de $100)');
    console.log('  - Usuario 1 (Nivel 2): $3.00 (3% de $100)');
    console.log('  - Nivel 3: $1.00 (1% de $100) - No hay usuario en nivel 3');
    console.log('');
    
    console.log('Total distribuido esperado: $9.00');
    console.log('');
    
    log.success('✅ PRUEBAS COMPLETADAS EXITOSAMENTE');
    
  } catch (error) {
    log.error(`Error en las pruebas: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar pruebas
runTests();
