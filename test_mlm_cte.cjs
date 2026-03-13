/**
 * PRUEBA SISTEMA MLM UNILEVEL CON CTE RECURSIVOS
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

async function main() {
    console.log("=== PRUEBA MLM UNILEVEL CON CTE ===\n");
    
    const ts = Date.now();
    
    // === CREAR USUARIO 1 (RAÍZ) ===
    console.log("[1] Creando Usuario 1 (Raíz)...");
    const u1 = await request('POST', '/auth/v1/signup', {
        email: `mlm1_${ts}@test.com`,
        password: "Test123456!",
        options: { data: { username: `root_${ts}` } }
    });
    
    await request('POST', '/rest/v1/profiles', {
        id: u1.data.user.id,
        username: `root_${ts}`,
        email: `mlm1_${ts}@test.com`,
        sponsor_id: null,
        referral_code: `R1${ts}`.substring(0,8).toUpperCase()
    });
    console.log(`✓ U1: ${u1.data.user.id.substring(0,8)}...\n`);
    await sleep(2500);
    
    // Obtener referral code con reintento
    let code1;
    for (let i = 0; i < 3; i++) {
        const rc1 = await request('GET', `/rest/v1/profiles?id=eq.${u1.data.user.id}`);
        if (rc1.data && rc1.data[0] && rc1.data[0].referral_code) {
            code1 = rc1.data[0].referral_code;
            break;
        }
        await sleep(1000);
    }
    if (!code1) code1 = 'NO-DISponible';
    console.log(`Referral Code U1: ${code1}\n`);
    
    // === CREAR USUARIO 2 (NIVEL 1 DE U1) ===
    console.log("[2] Creando Usuario 2 (Nivel 1 de U1)...");
    const u2 = await request('POST', '/auth/v1/signup', {
        email: `mlm2_${ts}@test.com`,
        password: "Test123456!",
        options: { data: { username: `user2_${ts}` } }
    });
    
    await request('POST', '/rest/v1/profiles', {
        id: u2.data.user.id,
        username: `user2_${ts}`,
        email: `mlm2_${ts}@test.com`,
        sponsor_id: u1.data.user.id,  // SPONSOR = U1
        referral_code: `R2${ts}`.substring(0,8).toUpperCase()
    });
    console.log(`✓ U2: ${u2.data.user.id.substring(0,8)}... | Sponsor: ${u1.data.user.id.substring(0,8)}...\n`);
    await sleep(1500);
    
    const rc2 = await request('GET', `/rest/v1/profiles?id=eq.${u2.data.user.id}`);
    const code2 = rc2.data[0].referral_code;
    
    // === CREAR USUARIO 3 (N1 DE U2, N2 DE U1) ===
    console.log("[3] Creando Usuario 3 (N1 de U2 → N2 de U1)...");
    const u3 = await request('POST', '/auth/v1/signup', {
        email: `mlm3_${ts}@test.com`,
        password: "Test123456!",
        options: { data: { username: `user3_${ts}` } }
    });
    
    await request('POST', '/rest/v1/profiles', {
        id: u3.data.user.id,
        username: `user3_${ts}`,
        email: `mlm3_${ts}@test.com`,
        sponsor_id: u2.data.user.id,  // SPONSOR = U2
        referral_code: `R3${ts}`.substring(0,8).toUpperCase()
    });
    console.log(`✓ U3: ${u3.data.user.id.substring(0,8)}... | Sponsor: ${u2.data.user.id.substring(0,8)}...\n`);
    await sleep(1500);
    
    const rc3 = await request('GET', `/rest/v1/profiles?id=eq.${u3.data.user.id}`);
    const code3 = rc3.data[0].referral_code;
    
    // === CREAR USUARIO 4 (N1 DE U3, N2 DE U2, N3 DE U1) ===
    console.log("[4] Creando Usuario 4 (N1 de U3 → N2 de U2 → N3 de U1)...");
    const u4 = await request('POST', '/auth/v1/signup', {
        email: `mlm4_${ts}@test.com`,
        password: "Test123456!",
        options: { data: { username: `user4_${ts}` } }
    });
    
    await request('POST', '/rest/v1/profiles', {
        id: u4.data.user.id,
        username: `user4_${ts}`,
        email: `mlm4_${ts}@test.com`,
        sponsor_id: u3.data.user.id,  // SPONSOR = U3
        referral_code: `R4${ts}`.substring(0,8).toUpperCase()
    });
    console.log(`✓ U4: ${u4.data.user.id.substring(0,8)}... | Sponsor: ${u3.data.user.id.substring(0,8)}...\n`);
    await sleep(3000);
    
    // Obtener referral codes con reintento
    async function getRefCode(userId, fallback) {
        for (let i = 0; i < 3; i++) {
            const r = await request('GET', `/rest/v1/profiles?id=eq.${userId}`);
            if (r.data && r.data[0] && r.data[0].referral_code) return r.data[0].referral_code;
            await sleep(800);
        }
        return fallback;
    }
    const code4 = await getRefCode(u4.data.user.id, 'N/A');
    
    // === VERIFICAR CON CTE RECURSIVO ===
    console.log("=== VERIFICANDO CON CTE RECURSIVO ===\n");
    
    console.log("[5] RPC: get_referrals_tree_recursive(U1)...");
    const tree = await request('POST', '/rest/v1/rpc/get_referrals_tree_recursive', { p_user_id: u1.data.user.id });
    if (tree.status === 200 && Array.isArray(tree.data)) {
        console.log(`✓ U1 tiene ${tree.data.length} referidos:`);
        tree.data.forEach(r => console.log(`   Nivel ${r.level}: ${r.username}`));
        
        const n1 = tree.data.filter(r => r.level === 1).length;
        const n2 = tree.data.filter(r => r.level === 2).length;
        const n3 = tree.data.filter(r => r.level === 3).length;
        
        console.log(`\n📊 U1: N1=${n1}, N2=${n2}, N3=${n3}`);
        
        if (n1 >= 1 && n2 >= 1 && n3 >= 1) {
            console.log("✅ ¡SISTEMA MLM UNILEVEL FUNCIONA!\n");
        } else {
            console.log("⚠️ Árbol incompleto\n");
        }
    }
    
    console.log("[6] RPC: get_referrals_by_level_recursive(U1, Nivel 1)...");
    const n1 = await request('POST', '/rest/v1/rpc/get_referrals_by_level_recursive', { p_user_id: u1.data.user.id, p_level: 1 });
    if (n1.status === 200 && Array.isArray(n1.data)) {
        console.log(`✓ Nivel 1: ${n1.data.length} referidos directos`);
        n1.data.forEach(r => console.log(`   - ${r.username}`));
    }
    
    console.log("\n[7] RPC: get_referrals_by_level_recursive(U1, Nivel 2)...");
    const n2 = await request('POST', '/rest/v1/rpc/get_referrals_by_level_recursive', { p_user_id: u1.data.user.id, p_level: 2 });
    if (n2.status === 200 && Array.isArray(n2.data)) {
        console.log(`✓ Nivel 2: ${n2.data.length} referidos`);
        n2.data.forEach(r => console.log(`   - ${r.username}`));
    }
    
    console.log("\n[8] RPC: get_referrals_by_level_recursive(U1, Nivel 3)...");
    const n3 = await request('POST', '/rest/v1/rpc/get_referrals_by_level_recursive', { p_user_id: u1.data.user.id, p_level: 3 });
    if (n3.status === 200 && Array.isArray(n3.data)) {
        console.log(`✓ Nivel 3: ${n3.data.length} referidos`);
        n3.data.forEach(r => console.log(`   - ${r.username}`));
    }
    
    console.log("\n[9] RPC: get_referral_counts_recursive(U1)...");
    const counts = await request('POST', '/rest/v1/rpc/get_referral_counts_recursive', { p_user_id: u1.data.user.id });
    if (counts.status === 200 && Array.isArray(counts.data) && counts.data.length > 0) {
        const c = counts.data[0];
        console.log(`✓ Conteos U1: Total=${c.total_referrals}, N1=${c.level_1_count}, N2=${c.level_2_count}, N3=${c.level_3_count}`);
    }
    
    console.log("\n=== RESUMEN ===");
    console.log(`
Árbol MLM:
  U1 (Raíz): ${u1.data.user.id.substring(0,8)}... [${code1}]
  └── U2 (Nivel 1): ${u2.data.user.id.substring(0,8)}... [${code2}]
      └── U3 (Nivel 2): ${u3.data.user.id.substring(0,8)}... [${code3}]
          └── U4 (Nivel 3): ${u4.data.user.id.substring(0,8)}... [${rc4?.data[0]?.referral_code || 'N/A'}]
`);
    
    console.log("=== PRUEBA COMPLETADA ===");
}

main().catch(console.error);
