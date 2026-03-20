-- ============================================
-- COMANDOS SQL PARA PRUEBAS - DEPÓSITOS
-- ============================================
-- Conexión: 
-- psql postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres
-- ============================================

-- 1. VER SALDOS DE UN USUARIO
-- Reemplazar 'USER_ID' con el ID real del usuario
SELECT 
    p.username,
    p.email,
    w.balance_disponible,
    w.balance_invertido,
    w.balance_comisiones,
    w.balance_retirado,
    w.profit_daily
FROM profiles p
JOIN wallets w ON w.user_id = p.id
WHERE p.id = 'USER_ID';

-- 2. VER TODOS LOS USUARIOS CON SUS SALDOS
SELECT 
    p.username,
    p.email,
    w.balance_disponible as disponible,
    w.balance_invertido as invertido,
    w.balance_comisiones as comisiones,
    w.profit_daily as profit_diario
FROM profiles p
JOIN wallets w ON w.user_id = p.id
ORDER BY p.created_at DESC;

-- 3. ACTUALIZAR SALDO INVERTIDO MANUALMENTE
-- Reemplazar 'USER_ID' y MONTO
UPDATE wallets 
SET 
    balance_invertido = balance_invertido + 100,  -- Sumar $100
    updated_at = NOW()
WHERE user_id = 'USER_ID';

-- 4. ACTUALIZAR SALDO DISPONIBLE MANUALMENTE
UPDATE wallets 
SET 
    balance_disponible = balance_disponible + 50,  -- Sumar $50
    updated_at = NOW()
WHERE user_id = 'USER_ID';

-- 5. REINICIAR SALDOS DE UN USUARIO (CUIDADO!)
UPDATE wallets 
SET 
    balance_disponible = 0,
    balance_invertido = 0,
    balance_comisiones = 0,
    profit_daily = 0,
    updated_at = NOW()
WHERE user_id = 'USER_ID';

-- 6. VER DEPÓSITOS RECIENTES
SELECT 
    d.id,
    d.user_id,
    p.username,
    d.amount,
    d.status,
    d.payment_method,
    d.created_at,
    d.completed_at
FROM deposits d
JOIN profiles p ON p.id = d.user_id
ORDER BY d.created_at DESC
LIMIT 20;

-- 7. VER TRANSACCIONES DE UN USUARIO
SELECT 
    t.id,
    t.user_id,
    p.username,
    t.type,
    t.amount,
    t.status,
    t.description,
    t.created_at
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.user_id = 'USER_ID'
ORDER BY t.created_at DESC
LIMIT 50;

-- 8. VER COMISIONES MLM DISTRIBUIDAS
SELECT 
    mc.id,
    mc.user_id,
    p.username,
    mc.amount,
    mc.level,
    mc.is_paid,
    mc.created_at
FROM mlm_commissions mc
JOIN profiles p ON p.id = mc.user_id
ORDER BY mc.created_at DESC
LIMIT 30;

-- 9. EJECUTAR DISTRIBUCIÓN DE GANANCIAS DIARIAS MANUALMENTE
-- Esto simula el cron job de pg_cron
SELECT distribute_daily_profit();

-- 10. VER GANANCIAS DIARIAS DISTRIBUIDAS
SELECT 
    t.user_id,
    p.username,
    SUM(t.amount) as total_profit,
    COUNT(*) as veces
FROM transactions t
JOIN profiles p ON p.id = t.user_id
WHERE t.type = 'profit'
GROUP BY t.user_id, p.username
ORDER BY total_profit DESC
LIMIT 20;

-- 11. ACTUALIZAR PROFIT DIARIO ACUMULADO EN WALLET
-- Reemplazar 'USER_ID' y MONTO
UPDATE wallets 
SET 
    profit_daily = profit_daily + 3.50,  -- Sumar $3.50 de profit
    updated_at = NOW()
WHERE user_id = 'USER_ID';

-- 12. VER ÁRBOL MLM DE UN USUARIO (CTE Recursivo)
SELECT * FROM get_referrals_tree_recursive('USER_ID');

-- 13. VER ESTADÍSTICAS DE ADMIN
SELECT * FROM get_admin_dashboard_stats();

-- 14. LIMPIEZA COMPLETA DE TABLAS (SOLO DESARROLLO!)
-- ⚠️ ESTO BORRA TODOS LOS DATOS
-- TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE mlm_commissions RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE deposits RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE withdrawals RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE transfers_internas RESTART IDENTITY CASCADE;
-- UPDATE wallets SET balance_disponible = 0, balance_invertido = 0, balance_comisiones = 0, profit_daily = 0;

-- ============================================
-- COMANDOS RÁPIDOS PARA PRUEBAS
-- ============================================

-- Sumar $1000 al saldo invertido de TODOS los usuarios (para pruebas)
UPDATE wallets 
SET 
    balance_invertido = balance_invertido + 1000,
    updated_at = NOW();

-- Sumar $100 al saldo disponible de TODOS los usuarios (para pruebas)
UPDATE wallets 
SET 
    balance_disponible = balance_disponible + 100,
    updated_at = NOW();

-- Resetear profit daily de TODOS los usuarios
UPDATE wallets 
SET 
    profit_daily = 0,
    updated_at = NOW();
