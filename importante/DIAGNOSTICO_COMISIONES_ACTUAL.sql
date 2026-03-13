-- ============================================================================
-- DIAGNÓSTICO DEL SISTEMA DE COMISIONES
-- ============================================================================
-- Ejecutar en: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- 1. VERIFICAR USUARIO asa4@gmail.com
SELECT 
    'USUARIO ASA4' AS seccion,
    p.id,
    p.username,
    p.email,
    p.sponsor_id,
    p.referral_code,
    (SELECT username FROM profiles WHERE id = p.sponsor_id) AS sponsor_username
FROM profiles p
WHERE p.email = 'asa4@gmail.com';

-- 2. VERIFICAR WALLET DE ASA4
SELECT 
    'WALLET ASA4' AS seccion,
    w.user_id,
    p.username,
    w.balance_disponible,
    w.balance_invertido,
    w.total_comisiones,
    w.total_retirado
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.email = 'asa4@gmail.com';

-- 3. VERIFICAR DEPÓSITOS DE ASA4
SELECT 
    'DEPÓSITOS ASA4' AS seccion,
    d.id,
    d.amount,
    d.status,
    d.created_at,
    (SELECT COUNT(*) FROM mlm_commissions mc WHERE mc.related_deposit_id = d.id) AS comisiones_generadas
FROM deposits d
JOIN profiles p ON d.user_id = p.id
WHERE p.email = 'asa4@gmail.com'
ORDER BY d.created_at DESC;

-- 4. VERIFICAR COMISIONES RECIBIDAS POR ASA4
SELECT 
    'COMISIONES RECIBIDAS ASA4' AS seccion,
    mc.id,
    mc.level,
    mc.type,
    mc.amount,
    mc.is_paid,
    fp.username AS generado_por,
    mc.created_at
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
LEFT JOIN profiles fp ON mc.from_user_id = fp.id
WHERE p.email = 'asa4@gmail.com'
ORDER BY mc.created_at DESC;

-- 5. VERIFICAR TRANSACCIONES DE TIPO COMMISSION
SELECT 
    'TRANSACCIONES COMMISSION ASA4' AS seccion,
    t.id,
    t.type,
    t.amount,
    t.description,
    t.created_at
FROM transactions t
JOIN profiles p ON t.user_id = p.id
WHERE p.email = 'asa4@gmail.com'
  AND t.type = 'commission'
ORDER BY t.created_at DESC;

-- 6. VERIFICAR REFERIDOS DIRECTOS DE ASA4
SELECT 
    'REFERIDOS DIRECTOS ASA4' AS seccion,
    p.id,
    p.username,
    p.email,
    p.referral_code
FROM profiles p
WHERE p.sponsor_id = (SELECT id FROM profiles WHERE email = 'asa4@gmail.com');

-- 7. VERIFICAR TRIGGERS EXISTENTES
SELECT 
    'TRIGGERS EN DEPOSITS' AS seccion,
    tgname AS nombre_trigger,
    tgenabled AS enabled
FROM pg_trigger
WHERE tgrelid = 'deposits'::regclass;

-- 8. VERIFICAR FUNCIONES EXISTENTES
SELECT 
    'FUNCIONES MLM' AS seccion,
    proname AS nombre_funcion,
    prosrc AS codigo
FROM pg_proc
WHERE proname IN (
    'distribute_deposit_commissions',
    'trigger_deposit_completed',
    'get_upline_sponsors'
);

-- 9. TOTAL DE COMISIONES POR USUARIO
SELECT 
    'RESUMEN COMISIONES POR USUARIO' AS seccion,
    p.username,
    p.email,
    COUNT(mc.id) AS cantidad_comisiones,
    COALESCE(SUM(mc.amount), 0) AS total_comisiones,
    w.total_comisiones AS en_wallet
FROM profiles p
LEFT JOIN mlm_commissions mc ON p.id = mc.user_id AND mc.is_paid = true
LEFT JOIN wallets w ON p.id = w.user_id
GROUP BY p.id, p.username, p.email, w.total_comisiones
HAVING COUNT(mc.id) > 0 OR w.total_comisiones > 0
ORDER BY total_comisiones DESC;

-- 10. DEPÓSITOS SIN COMISIONES DISTRIBUIDAS (PROBLEMA)
SELECT 
    'DEPÓSITOS SIN COMISIONES (PROBLEMA)' AS seccion,
    d.id,
    d.user_id,
    p.username,
    d.amount,
    d.status,
    d.created_at
FROM deposits d
JOIN profiles p ON d.user_id = p.id
WHERE d.status = 'completed'
  AND NOT EXISTS (
      SELECT 1 FROM mlm_commissions mc 
      WHERE mc.related_deposit_id = d.id
  )
ORDER BY d.created_at DESC;

-- 11. COMISIONES DUPLICADAS (PROBLEMA)
SELECT 
    'COMISIONES DUPLICADAS (PROBLEMA)' AS seccion,
    related_deposit_id,
    user_id,
    level,
    COUNT(*) as cantidad,
    SUM(amount) as monto_total
FROM mlm_commissions
GROUP BY related_deposit_id, user_id, level
HAVING COUNT(*) > 1;
