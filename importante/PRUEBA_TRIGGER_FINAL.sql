-- ============================================================================
-- PRUEBA FINAL - TRIGGER DE COMISIONES
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- 1. CREAR DEPÓSITO DE PRUEBA (status: pending)
INSERT INTO deposits (user_id, amount, currency, status, payment_method)
VALUES (
    '47f6cc6e-49f0-4358-8946-6f191365d1de',  -- ASA4
    25.00,
    'USD',
    'pending',
    'test_trigger'
)
RETURNING id, status;

-- 2. ACTUALIZAR A COMPLETED (esto debe activar el trigger)
UPDATE deposits 
SET status = 'completed', 
    completed_at = NOW()
WHERE user_id = '47f6cc6e-49f0-4358-8946-6f191365d1de'
  AND status = 'pending'
  AND payment_method = 'test_trigger'
RETURNING id, status, completed_at;

-- 3. VERIFICAR COMISIONES CREADAS
SELECT 
    'COMISIONES GENERADAS' AS estado,
    mc.level,
    p.username AS recibe,
    mc.amount AS monto,
    mc.percentage,
    d.amount AS deposito_original,
    d.id AS deposito_id
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
JOIN deposits d ON mc.related_deposit_id = d.id
WHERE d.payment_method = 'test_trigger'
ORDER BY mc.level;

-- 4. VERIFICAR WALLETS ACTUALIZADAS
SELECT 
    'WALLETS ACTUALIZADAS' AS estado,
    p.username,
    w.balance_disponible,
    w.total_comisiones
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.username IN ('asa3', 'asa2', 'asa1')
ORDER BY p.username;

-- ============================================================================
-- RESULTADO ESPERADO:
-- Deposito de $25
-- ASA3 (N1): $1.25 (5%)
-- ASA2 (N2): $0.75 (3%)
-- ASA1 (N3): $0.25 (1%)
-- ============================================================================
