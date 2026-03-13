-- ============================================================================
-- PRUEBA COMPLETA SISTEMA DE COMISIONES MLM
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================
-- Este script:
-- 1. Crea 3 usuarios en cadena (A → B → C)
-- 2. Crea un depósito completado de $100 para Usuario C
-- 3. Ejecuta manualmente la distribución de comisiones
-- 4. Muestra resultados
-- ============================================================================

-- ============================================================================
-- PASO 1: LIMPIAR DATOS DE PRUEBA ANTERIORES
-- ============================================================================

DELETE FROM mlm_commissions WHERE from_user_id IN (
    SELECT id FROM profiles WHERE username LIKE 'test_mlm_%'
);

DELETE FROM deposits WHERE user_id IN (
    SELECT id FROM profiles WHERE username LIKE 'test_mlm_%'
);

DELETE FROM wallets WHERE user_id IN (
    SELECT id FROM profiles WHERE username LIKE 'test_mlm_%'
);

DELETE FROM profiles WHERE username LIKE 'test_mlm_%';

-- ============================================================================
-- PASO 2: CREAR 3 USUARIOS EN CADENA
-- ============================================================================

-- Usuario A (Raíz - sin sponsor)
INSERT INTO profiles (username, email, sponsor_id, referral_code, is_active)
VALUES ('test_mlm_A', 'test_mlm_A@test.com', NULL, 'MLMA001', TRUE)
RETURNING id;

-- Usuario B (Sponsor = A)
INSERT INTO profiles (username, email, sponsor_id, referral_code, is_active)
VALUES ('test_mlm_B', 'test_mlm_B@test.com', 
        (SELECT id FROM profiles WHERE username = 'test_mlm_A'), 
        'MLMB001', TRUE)
RETURNING id, sponsor_id;

-- Usuario C (Sponsor = B)
INSERT INTO profiles (username, email, sponsor_id, referral_code, is_active)
VALUES ('test_mlm_C', 'test_mlm_C@test.com', 
        (SELECT id FROM profiles WHERE username = 'test_mlm_B'), 
        'MLMC001', TRUE)
RETURNING id, sponsor_id;

-- Crear wallets para cada usuario
INSERT INTO wallets (user_id)
SELECT id FROM profiles WHERE username LIKE 'test_mlm_%'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PASO 3: VERIFICAR USUARIOS CREADOS
-- ============================================================================

SELECT 
    'USUARIOS CREADOS' AS estado,
    p.username,
    p.email,
    sponsor.username AS sponsor_username,
    p.referral_code
FROM profiles p
LEFT JOIN profiles sponsor ON p.sponsor_id = sponsor.id
WHERE p.username LIKE 'test_mlm_%'
ORDER BY p.username;

-- ============================================================================
-- PASO 4: CREAR DEPÓSITO COMPLETADO PARA USUARIO C
-- ============================================================================

INSERT INTO deposits (user_id, amount, currency, status, payment_method, completed_at)
VALUES (
    (SELECT id FROM profiles WHERE username = 'test_mlm_C'),
    100.00,
    'USD',
    'completed',
    'test_manual',
    NOW()
)
RETURNING id, user_id, amount, status;

-- ============================================================================
-- PASO 5: EJECUTAR DISTRIBUCIÓN DE COMISIONES MANUALMENTE
-- ============================================================================

SELECT 
    'EJECUTANDO DISTRIBUCIÓN DE COMISIONES' AS estado;

SELECT * FROM distribute_deposit_commissions(
    (SELECT id FROM deposits WHERE user_id = (SELECT id FROM profiles WHERE username = 'test_mlm_C') 
     ORDER BY created_at DESC LIMIT 1)
);

-- ============================================================================
-- PASO 6: VERIFICAR COMISIONES CREADAS
-- ============================================================================

SELECT 
    'COMISIONES CREADAS' AS estado,
    mc.level,
    p.username AS recibe_comision,
    fp.username AS generado_por,
    mc.amount AS monto_comision,
    mc.percentage,
    mc.type
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
JOIN profiles fp ON mc.from_user_id = fp.id
WHERE mc.from_user_id IN (SELECT id FROM profiles WHERE username LIKE 'test_mlm_%')
ORDER BY mc.level;

-- ============================================================================
-- PASO 7: VERIFICAR WALLETS ACTUALIZADAS
-- ============================================================================

SELECT 
    'WALLETS ACTUALIZADAS' AS estado,
    p.username,
    w.balance_disponible,
    w.balance_invertido,
    w.total_comisiones
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.username LIKE 'test_mlm_%'
ORDER BY p.username;

-- ============================================================================
-- PASO 8: RESUMEN ESPERADO
-- ============================================================================

SELECT '=== RESULTADO ESPERADO ===' AS informe;
SELECT 'Usuario B (Nivel 1): Debería tener $5.00 de comisión (5% de $100)' AS esperado;
SELECT 'Usuario A (Nivel 2): Debería tener $3.00 de comisión (3% de $100)' AS esperado;
SELECT 'Usuario C (Depositante): Su wallet invertida debería tener $100' AS esperado;
SELECT 'Total distribuido: $8.00 (no hay Nivel 3 porque A no tiene sponsor)' AS esperado;

-- ============================================================================
-- PASO 9: PROBAR CON 4 USUARIOS PARA VER LOS 3 NIVELES
-- ============================================================================

-- Crear Usuario D (Sponsor = C)
INSERT INTO profiles (username, email, sponsor_id, referral_code, is_active)
VALUES ('test_mlm_D', 'test_mlm_D@test.com', 
        (SELECT id FROM profiles WHERE username = 'test_mlm_C'), 
        'MLMD001', TRUE);

INSERT INTO wallets (user_id) 
SELECT id FROM profiles WHERE username = 'test_mlm_D'
ON CONFLICT (user_id) DO NOTHING;

-- Crear depósito de $100 para Usuario D
INSERT INTO deposits (user_id, amount, currency, status, payment_method, completed_at)
VALUES (
    (SELECT id FROM profiles WHERE username = 'test_mlm_D'),
    100.00,
    'USD',
    'completed',
    'test_manual_2',
    NOW()
);

-- Distribuir comisiones
SELECT 
    'COMISIONES DEPÓSITO USUARIO D' AS estado,
    mc.level,
    p.username AS recibe,
    mc.amount AS monto
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
WHERE mc.from_user_id = (SELECT id FROM profiles WHERE username = 'test_mlm_D')
ORDER BY mc.level;

SELECT '=== CON 4 USUARIOS (A→B→C→D) ===' AS informe;
SELECT 'Cuando D deposita $100:' AS escenario;
SELECT 'C (Nivel 1): $5.00 (5%)' AS esperado;
SELECT 'B (Nivel 2): $3.00 (3%)' AS esperado;
SELECT 'A (Nivel 3): $1.00 (1%)' AS esperado;
SELECT 'Total: $9.00' AS esperado;

-- ============================================================================
-- FIN DEL SCRIPT DE PRUEBA
-- ============================================================================
