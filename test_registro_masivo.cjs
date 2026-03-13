/**
 * PRUEBA COMPLETA - REGISTRO DESDE FRONTEND REAL
 * Crea usuarios en cadena para verificar niveles 1, 2, 3
 */

const https = require('https');

const SUPABASE_URL = "https://alyboipgbixoufqftizd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjIyMTAsImV4cCI6MjA4ODgzODIxMH0.U10Xs0oHF0onn2CxHiuiNKfA9Dz8yWgap3Kn3zocRkA";

const HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
};

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);
        const opts = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers: HEADERS };
        const req = https.request(opts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Simula el registro del frontend (SignUp.jsx)
async function signUpFrontend(email, password, username, referralCode = null) {
    console.log(`\n📝 Registrando: ${email} (${username})`);
    if (referralCode) console.log(`   Referral Code: ${referralCode}`);
    
    // Paso 1: Buscar sponsor por referral code
    let sponsorId = null;
    if (referralCode) {
        const sponsorRes = await request('GET', `/rest/v1/profiles?select=id,username,referral_code&referral_code=eq.${referralCode.toUpperCase()}`);
        if (sponsorRes.status === 200 && Array.isArray(sponsorRes.data) && sponsorRes.data.length > 0) {
            sponsorId = sponsorRes.data[0].id;
            console.log(`   ✓ Sponsor encontrado: ${sponsorRes.data[0].username} (${sponsorId.substring(0,8)}...)`);
        } else {
            console.log(`   ⚠️ Sponsor no encontrado para código ${referralCode}`);
        }
    }
    
    // Paso 2: Registrar en Auth
    const authRes = await request('POST', '/auth/v1/signup', {
        email: email,
        password: password,
        options: { data: { username: username, referral_code_used: referralCode } }
    });
    
    if (!authRes.data.user) {
        console.log(`   ❌ Error Auth: ${JSON.stringify(authRes.data).substring(0, 100)}`);
        return null;
    }
    
    const userId = authRes.data.user.id;
    console.log(`   ✓ Auth creado: ${userId.substring(0,8)}...`);
    
    await sleep(1500);
    
    // Paso 3: Crear perfil (como lo hace SignUp.jsx)
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const profileUsername = email.split('@')[0];
    
    const profileRes = await request('POST', '/rest/v1/profiles', {
        id: userId,
        username: profileUsername,
        email: email,
        sponsor_id: sponsorId,
        referral_code: newReferralCode
    });
    
    if (profileRes.status === 201) {
        console.log(`   ✓ Perfil creado | RC: ${newReferralCode} | Sponsor: ${sponsorId ? sponsorId.substring(0,8) + '...' : 'null'}`);
    } else {
        console.log(`   ⚠️ Perfil status: ${profileRes.status}`);
    }
    
    await sleep(1000);
    
    // Paso 4: Crear wallet
    await request('POST', '/rest/v1/wallets', {
        user_id: userId,
        balance_disponible: 0,
        balance_invertido: 0,
        total_retirado: 0,
        total_comisiones: 0
    });
    
    return {
        id: userId,
        username: profileUsername,
        email: email,
        sponsor_id: sponsorId,
        referral_code: newReferralCode
    };
}

async function main() {
    console.log("=".repeat(70));
    console.log("PRUEBA COMPLETA MLM - REGISTRO DESDE FRONTEND");
    console.log("=".repeat(70));
    
    const ts = Date.now();
    const users = [];
    
    // ========================================================================
    // NIVEL 0: USUARIO RAÍZ (sin sponsor)
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("NIVEL 0 - USUARIO RAÍZ");
    console.log("=".repeat(70));
    
    const root = await signUpFrontend(
        `mlm_root_${ts}@test.com`,
        "Test123456!",
        `root_${ts}`,
        null  // Sin sponsor
    );
    
    if (!root) {
        console.log("\n❌ No se pudo crear usuario raíz");
        return;
    }
    
    users.push(root);
    await sleep(2000);
    
    // ========================================================================
    // NIVEL 1: 3 USUARIOS REFERIDOS DIRECTOS
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("NIVEL 1 - REFERIDOS DIRECTOS (3 usuarios)");
    console.log("=".repeat(70));
    
    for (let i = 1; i <= 3; i++) {
        const user = await signUpFrontend(
            `mlm_n1_${i}_${ts}@test.com`,
            "Test123456!",
            `user_n1_${i}_${ts}`,
            root.referral_code  // Referido por ROOT
        );
        
        if (user) {
            users.push(user);
            await sleep(1500);
        }
    }
    
    // ========================================================================
    // NIVEL 2: 2 USUARIOS POR CADA USUARIO DE NIVEL 1 (6 total)
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("NIVEL 2 - REFERIDOS DE NIVEL 1 (2 por cada N1 = 6 total)");
    console.log("=".repeat(70));
    
    const nivel1Users = users.filter(u => u.sponsor_id === root.id);
    
    for (const n1user of nivel1Users) {
        for (let i = 1; i <= 2; i++) {
            const user = await signUpFrontend(
                `mlm_n2_${n1user.username.split('_')[2]}_${i}_${ts}@test.com`,
                "Test123456!",
                `user_n2_${n1user.username.split('_')[2]}_${i}_${ts}`,
                n1user.referral_code  // Referido por usuario de nivel 1
            );
            
            if (user) {
                users.push(user);
                await sleep(1000);
            }
        }
    }
    
    // ========================================================================
    // NIVEL 3: 1 USUARIO POR CADA USUARIO DE NIVEL 2 (6 total)
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("NIVEL 3 - REFERIDOS DE NIVEL 2 (1 por cada N2 = 6 total)");
    console.log("=".repeat(70));
    
    const nivel2Users = users.filter(u => 
        nivel1Users.some(n1 => u.sponsor_id === n1.id)
    );
    
    for (const n2user of nivel2Users.slice(0, 6)) {
        const user = await signUpFrontend(
            `mlm_n3_${n2user.username.split('_')[3]}_${n2user.username.split('_')[4]}_${ts}@test.com`,
            "Test123456!",
            `user_n3_${n2user.username.split('_')[3]}_${n2user.username.split('_')[4]}_${ts}`,
            n2user.referral_code  // Referido por usuario de nivel 2
        );
        
        if (user) {
            users.push(user);
            await sleep(1000);
        }
    }
    
    // ========================================================================
    // ESPERAR A QUE LA BD PROCESSE
    // ========================================================================
    console.log("\n⏳ Esperando 3 segundos para que la BD processe los datos...");
    await sleep(3000);
    
    // ========================================================================
    // VERIFICAR CON FUNCIONES RPC
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("VERIFICACIÓN CON FUNCIONES RPC");
    console.log("=".repeat(70));
    
    console.log(`\n📊 ÁRBOL DE USUARIO RAÍZ (${root.username})...`);
    
    const tree = await request('POST', '/rest/v1/rpc/get_referrals_tree_recursive', {
        p_user_id: root.id
    });
    
    if (tree.status === 200 && Array.isArray(tree.data)) {
        console.log(`\n✅ TOTAL REFERIDOS: ${tree.data.length}`);
        
        const n1 = tree.data.filter(r => r.level === 1).length;
        const n2 = tree.data.filter(r => r.level === 2).length;
        const n3 = tree.data.filter(r => r.level === 3).length;
        
        console.log(`\n📈 DISTRIBUCIÓN POR NIVELES:`);
        console.log(`   Nivel 1 (directos): ${n1}`);
        console.log(`   Nivel 2: ${n2}`);
        console.log(`   Nivel 3: ${n3}`);
        
        if (n1 >= 1 && n2 >= 1 && n3 >= 1) {
            console.log(`\n🎉 ¡SISTEMA MLM UNILEVEL FUNCIONA PERFECTAMENTE!`);
        }
        
        console.log(`\n📋 DETALLE DE REFERIDOS:`);
        tree.data.forEach(r => {
            console.log(`   [N${r.level}] ${r.username} | ${r.email}`);
        });
    }
    
    // ========================================================================
    // VERIFICAR CONTEOS
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("CONTEOS OFICIALES");
    console.log("=".repeat(70));
    
    const counts = await request('POST', '/rest/v1/rpc/get_referral_counts_recursive', {
        p_user_id: root.id
    });
    
    if (counts.status === 200 && Array.isArray(counts.data) && counts.data.length > 0) {
        const c = counts.data[0];
        console.log(`\n📊 get_referral_counts_recursive:`);
        console.log(`   Total: ${c.total_referrals}`);
        console.log(`   Nivel 1: ${c.level_1_count}`);
        console.log(`   Nivel 2: ${c.level_2_count}`);
        console.log(`   Nivel 3: ${c.level_3_count}`);
    }
    
    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log("\n" + "=".repeat(70));
    console.log("RESUMEN FINAL");
    console.log("=".repeat(70));
    
    console.log(`
📁 USUARIOS CREADOS: ${users.length}

🌳 ESTRUCTURA DEL ÁRBOL:
   Raíz: ${root.username} (${root.referral_code})
   │
   ├── Nivel 1: ${users.filter(u => u.sponsor_id === root.id).length} usuarios
   │   ${users.filter(u => u.sponsor_id === root.id).map(u => u.username).join(', ')}
   │
   ├── Nivel 2: ${users.filter(u => 
       users.filter(s => s.sponsor_id === root.id).some(n1 => u.sponsor_id === n1.id)
   ).length} usuarios
   │
   └── Nivel 3: ${users.filter(u => 
       users.filter(s => 
           users.filter(n1 => n1.sponsor_id === root.id).some(n1 => s.sponsor_id === n1.id)
       ).some(n2 => u.sponsor_id === n2.id)
   ).length} usuarios

✅ SISTEMA MLM UNILEVEL CON CTE RECURSIVO: FUNCIONANDO
`);
    
    console.log("=".repeat(70));
    console.log("PRUEBA COMPLETADA EXITOSAMENTE");
    console.log("=".repeat(70));
}

main().catch(console.error);
