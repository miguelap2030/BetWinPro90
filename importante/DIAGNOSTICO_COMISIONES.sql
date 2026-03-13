-- ============================================================================
-- DIAGNÓSTICO - SISTEMA DE COMISIONES MLM
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- 1. VERIFICAR SI EXISTEN LAS FUNCIONES
SELECT 
    'FUNCIONES' AS seccion,
    proname AS nombre,
    'EXISTS' AS estado
FROM pg_proc
WHERE proname IN (
    'get_upline_sponsors',
    'distribute_deposit_commissions',
    'trigger_deposit_completed'
);

-- 2. VERIFICAR SI EXISTEN LOS TRIGGERS
SELECT 
    'TRIGGERS' AS seccion,
    tgname AS nombre,
    CASE tgenabled 
        WHEN 'O' THEN 'ENABLED' 
        WHEN 'D' THEN 'DISABLED' 
        ELSE 'UNKNOWN' 
    END AS estado
FROM pg_trigger
WHERE tgname = 'trg_deposit_completed';

-- 3. VERIFICAR TABLA MLM_COMMISSIONS
SELECT 
    'MLM_COMMISSIONS' AS tabla,
    COUNT(*) AS registros
FROM mlm_commissions;

-- 4. VERIFICAR DEPÓSITOS COMPLETADOS
SELECT 
    'DEPOSITS' AS tabla,
    id,
    user_id,
    amount,
    status,
    created_at
FROM deposits
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- 5. VERIFICAR USUARIOS CON SPONSOR
SELECT 
    'USUARIOS CON SPONSOR' AS seccion,
    p.id AS user_id,
    p.username,
    p.sponsor_id,
    sponsor.username AS sponsor_username
FROM profiles p
LEFT JOIN profiles sponsor ON p.sponsor_id = sponsor.id
WHERE p.sponsor_id IS NOT NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. PROBAR FUNCIÓN GET_UPLINE_SPONSORS MANUALMENTE
-- (Reemplaza con un user_id real que tenga sponsor)
SELECT 
    'TEST UPLINE' AS prueba,
    *
FROM get_upline_sponsors(
    (SELECT id FROM profiles WHERE sponsor_id IS NOT NULL LIMIT 1),
    3
);

-- 7. VERIFICAR SI EL TRIGGER SE ESTÁ EJECUTANDO
-- Creamos una tabla de log temporal
CREATE TABLE IF NOT EXISTS trigger_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT,
    deposit_id UUID,
    user_id UUID,
    amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ACTUALIZAR TRIGGER CON LOGGING
DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();

CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_count INT;
BEGIN
    -- Log para debugging
    INSERT INTO trigger_log (event_name, deposit_id, user_id, amount, status)
    VALUES ('trigger_fired', NEW.id, NEW.user_id, NEW.amount, NEW.status);

    -- Solo ejecutar cuando el depósito cambia a 'completed'
    IF NEW.status = 'completed' 
       AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Log: actualizando wallet
        INSERT INTO trigger_log (event_name, deposit_id, user_id, amount, status)
        VALUES ('updating_wallet', NEW.id, NEW.user_id, NEW.amount, NEW.status);
        
        -- Actualizar wallet del usuario que depositó
        INSERT INTO wallets (user_id, balance_invertido)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance_invertido = wallets.balance_invertido + NEW.amount,
            updated_at = NOW();

        -- Log: distribuyendo comisiones
        INSERT INTO trigger_log (event_name, deposit_id, user_id, amount, status)
        VALUES ('distributing_commissions', NEW.id, NEW.user_id, NEW.amount, NEW.status);

        -- DISTRIBUIR COMISIONES MLM
        SELECT COUNT(*) INTO v_commission_count
        FROM distribute_deposit_commissions(NEW.id);

        -- Log: comisiones distribuidas
        INSERT INTO trigger_log (event_name, deposit_id, user_id, amount, status)
        VALUES ('commissions_distributed', NEW.id, NEW.user_id, NEW.amount, 
                'Count: ' || v_commission_count::TEXT);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trg_deposit_completed
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- 9. VERIFICAR TRIGGER CREADO
SELECT 
    'TRIGGER ACTUALIZADO' AS estado,
    tgname AS nombre,
    tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'trg_deposit_completed';

-- ============================================================================
-- INSTRUCCIONES PARA PROBAR
-- ============================================================================
-- 1. Ejecuta este script
-- 2. Crea un depósito: INSERT INTO deposits (user_id, amount, status) VALUES ('USER_ID', 100, 'pending');
-- 3. Actualiza a completed: UPDATE deposits SET status = 'completed' WHERE id = 'DEPOSIT_ID';
-- 4. Verifica: SELECT * FROM trigger_log ORDER BY created_at DESC;
-- 5. Verifica comisiones: SELECT * FROM mlm_commissions;
-- ============================================================================
