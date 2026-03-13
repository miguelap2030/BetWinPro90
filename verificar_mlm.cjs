/**
 * PRUEBA DIRECTA - VERIFICAR SISTEMA MLM
 * Usa IDs de usuarios existentes para probar CTE recursivo
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

async function main() {
    console.log("=== VERIFICACIÓN DIRECTA DEL SISTEMA MLM ===\n");
    
    // === 1. VERIFICAR PERFILES EXISTENTES ===
    console.log("[1] Obteniendo perfiles existentes...");
    const profiles = await request('GET', '/rest/v1/profiles?select=id,username,email,sponsor_id,referral_code&order=created_at.desc&limit=10');
    
    if (profiles.status === 200 && Array.isArray(profiles.data)) {
        console.log(`✓ ${profiles.data.length} perfiles encontrados\n`);
        
        // Mostrar perfiles con sponsor
        const conSponsor = profiles.data.filter(p => p.sponsor_id);
        console.log(`Perfiles con sponsor: ${conSponsor.length}`);
        conSponsor.forEach(p => {
            console.log(`  - ${p.username} | Sponsor: ${p.sponsor_id?.substring(0,8)}...`);
        });
        console.log();
    }
    
    // === 2. ENCONTRAR UN USUARIO RAÍZ (sin sponsor) ===
    console.log("[2] Buscando usuario raíz para probar árbol...");
    const root = profiles.data.find(p => !p.sponsor_id);
    
    if (!root) {
        console.log("⚠️ No se encontró usuario raíz, creando uno nuevo...\n");
        
        const ts = Date.now();
        const res = await request('POST', '/auth/v1/signup', {
            email: `root_${ts}@test.com`,
            password: "Test123456!",
            options: { data: { username: `root_${ts}` } }
        });
        
        if (res.data.user) {
            console.log(`✓ Usuario creado: ${res.data.user.id.substring(0,8)}...`);
            // El frontend debería crear el perfil automáticamente
        }
        return;
    }
    
    console.log(`✓ Usuario raíz encontrado: ${root.username} (${root.id.substring(0,8)}...)\n`);
    
    // === 3. PROBAR CTE RECURSIVO ===
    console.log("[3] Probando get_referrals_tree_recursive...");
    const tree = await request('POST', '/rest/v1/rpc/get_referrals_tree_recursive', { p_user_id: root.id });
    
    if (tree.status === 200 && Array.isArray(tree.data)) {
        if (tree.data.length > 0) {
            console.log(`✓ Árbol encontrado: ${tree.data.length} referidos`);
            tree.data.forEach(r => {
                console.log(`   Nivel ${r.level}: ${r.username}`);
            });
            
            const n1 = tree.data.filter(r => r.level === 1).length;
            const n2 = tree.data.filter(r => r.level === 2).length;
            const n3 = tree.data.filter(r => r.level === 3).length;
            
            console.log(`\n📊 Resumen: N1=${n1}, N2=${n2}, N3=${n3}`);
            
            if (n1 >= 1 && n2 >= 1 && n3 >= 1) {
                console.log("✅ ¡SISTEMA MLM FUNCIONA PERFECTAMENTE!\n");
            } else if (n1 > 0) {
                console.log("⚠️ Árbol parcial - Solo algunos niveles funcionan\n");
            } else {
                console.log("⚠️ No hay referidos en el árbol\n");
            }
        } else {
            console.log("ℹ️ Este usuario no tiene referidos aún\n");
        }
    } else {
        console.log(`❌ Error en RPC: ${tree.status}`);
        console.log(JSON.stringify(tree.data));
    }
    
    // === 4. PROBAR CONTEOS ===
    console.log("[4] Probando get_referral_counts_recursive...");
    const counts = await request('POST', '/rest/v1/rpc/get_referral_counts_recursive', { p_user_id: root.id });
    
    if (counts.status === 200 && Array.isArray(counts.data) && counts.data.length > 0) {
        const c = counts.data[0];
        console.log(`✓ Conteos: Total=${c.total_referrals}, N1=${c.level_1_count}, N2=${c.level_2_count}, N3=${c.level_3_count}\n`);
    }
    
    // === 5. RESUMEN ===
    console.log("=== RESUMEN ===");
    console.log(`
Estado del sistema:
  - Total perfiles: ${profiles.data?.length || 0}
  - Con sponsor: ${conSponsor?.length || 0}
  - Usuario raíz: ${root?.username || 'N/A'}
  - Referidos en árbol: ${tree.data?.length || 0}
`);
    
    console.log("=== PRUEBA COMPLETADA ===");
}

main().catch(console.error);
