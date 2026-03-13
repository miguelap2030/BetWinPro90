-- ============================================================================
-- CREAR Y PROBAR SISTEMA DE COMISIONES MLM
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR Y CREAR TABLA MLM_COMMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mlm_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'residual', 'bonus')),
    amount NUMERIC(18, 8) NOT NULL CHECK (amount >= 0),
    percentage NUMERIC(5, 2) DEFAULT 0,
    related_deposit_id UUID REFERENCES deposits(id) ON DELETE SET NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREAR FUNCIÓN GET_UPLINE_SPONSORS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upline_sponsors(p_user_id UUID, p_max_level INT DEFAULT 3)
RETURNS TABLE (
    sponsor_id UUID,
    username TEXT,
    level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_sponsor_id UUID;
    current_level INT := 1;
BEGIN
    SELECT sponsor_id INTO current_sponsor_id
    FROM profiles
    WHERE id = p_user_id;

    WHILE current_sponsor_id IS NOT NULL AND current_level <= p_max_level LOOP
        RETURN QUERY
        SELECT
            p.id AS sponsor_id,
            p.username,
            current_level AS level
        FROM profiles p
        WHERE p.id = current_sponsor_id;

        SELECT sponsor_id INTO current_sponsor_id
        FROM profiles
        WHERE id = current_sponsor_id;

        current_level := current_level + 1;
    END LOOP;
END;
$$;

-- ============================================================================
-- 3. CREAR FUNCIÓN DISTRIBUTE_DEPOSIT_COMMISSIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION distribute_deposit_commissions(p_deposit_id UUID)
RETURNS TABLE (
    level INT,
    sponsor_username TEXT,
    commission_amount NUMERIC,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deposit RECORD;
    v_upline RECORD;
    v_commission NUMERIC(18, 8);
    v_percentage NUMERIC(5, 2);
BEGIN
    SELECT * INTO v_deposit
    FROM deposits
    WHERE id = p_deposit_id
      AND status = 'completed';

    IF v_deposit IS NULL THEN
        RAISE NOTICE 'Depósito no encontrado o no está completado: %', p_deposit_id;
        RETURN;
    END IF;

    FOR v_upline IN SELECT * FROM get_upline_sponsors(v_deposit.user_id, 3) LOOP
        CASE v_upline.level
            WHEN 1 THEN v_percentage := 5.00;
            WHEN 2 THEN v_percentage := 3.00;
            WHEN 3 THEN v_percentage := 1.00;
            ELSE v_percentage := 0.00;
        END CASE;

        v_commission := v_deposit.amount * (v_percentage / 100);

        IF v_commission > 0 THEN
            INSERT INTO mlm_commissions (
                user_id, from_user_id, level, type, amount, percentage,
                related_deposit_id, is_paid
            ) VALUES (
                v_upline.sponsor_id, v_deposit.user_id, v_upline.level,
                'deposit', v_commission, v_percentage, p_deposit_id, TRUE
            );

            UPDATE wallets
            SET balance_disponible = balance_disponible + v_commission,
                total_comisiones = total_comisiones + v_commission
            WHERE user_id = v_upline.sponsor_id;

            RETURN QUERY
            SELECT
                v_upline.level,
                v_upline.username,
                v_commission,
                TRUE;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 4. CREAR TRIGGER PARA DEPÓSITOS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();

CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' 
       AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        INSERT INTO wallets (user_id, balance_invertido)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance_invertido = wallets.balance_invertido + NEW.amount;

        PERFORM distribute_deposit_commissions(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposit_completed
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- ============================================================================
-- 5. VERIFICAR ESTRUCTURA
-- ============================================================================

SELECT 'FUNCIONES CREADAS' AS estado;
SELECT proname AS funcion FROM pg_proc 
WHERE proname IN ('get_upline_sponsors', 'distribute_deposit_commissions', 'trigger_deposit_completed');

SELECT 'TRIGGER CREADO' AS estado;
SELECT tgname AS trigger FROM pg_trigger WHERE tgname = 'trg_deposit_completed';

-- ============================================================================
-- 6. PRUEBA REAL - CREAR DATOS DE PRUEBA
-- ============================================================================

-- Crear 3 usuarios en cadena
DO $$
DECLARE
    v_user1 UUID;
    v_user2 UUID;
    v_user3 UUID;
    v_deposit_id UUID;
BEGIN
    -- Usuario 1 (raíz)
    v_user1 := uuid_generate_v4();
    INSERT INTO profiles (id, username, email, sponsor_id, referral_code, is_active)
    VALUES (v_user1, 'test_comision_1', 'test1@comision.com', NULL, 'TEST001', TRUE);
    INSERT INTO wallets (user_id) VALUES (v_user1);

    -- Usuario 2 (sponsor = Usuario 1)
    v_user2 := uuid_generate_v4();
    INSERT INTO profiles (id, username, email, sponsor_id, referral_code, is_active)
    VALUES (v_user2, 'test_comision_2', 'test2@comision.com', v_user1, 'TEST002', TRUE);
    INSERT INTO wallets (user_id) VALUES (v_user2);

    -- Usuario 3 (sponsor = Usuario 2)
    v_user3 := uuid_generate_v4();
    INSERT INTO profiles (id, username, email, sponsor_id, referral_code, is_active)
    VALUES (v_user3, 'test_comision_3', 'test3@comision.com', v_user2, 'TEST003', TRUE);
    INSERT INTO wallets (user_id) VALUES (v_user3);

    -- Crear depósito completado de Usuario 3
    v_deposit_id := uuid_generate_v4();
    INSERT INTO deposits (id, user_id, amount, currency, status, payment_method, completed_at)
    VALUES (v_deposit_id, v_user3, 100.00, 'USD', 'completed', 'test', NOW());

    RAISE NOTICE 'Usuarios creados: % (U1), % (U2), % (U3)', v_user1, v_user2, v_user3;
    RAISE NOTICE 'Depósito creado: % - Monto: $100', v_deposit_id;
END $$;

-- ============================================================================
-- 7. VERIFICAR RESULTADOS
-- ============================================================================

SELECT '=== COMISIONES CREADAS ===' AS resultado;
SELECT 
    mc.level,
    p.username AS sponsor_username,
    mc.amount AS comision,
    mc.percentage,
    mc.created_at
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
ORDER BY mc.level;

SELECT '=== WALLETS ACTUALIZADAS ===' AS resultado;
SELECT 
    p.username,
    w.balance_disponible,
    w.total_comisiones
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.username LIKE 'test_comision_%'
ORDER BY p.username;

SELECT '=== RESUMEN ===' AS resultado;
SELECT 
    'Total comisiones: ' || COUNT(*)::TEXT AS resumen
FROM mlm_commissions;

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script completo
-- 2. Deberías ver 2 comisiones creadas (Nivel 1: $5, Nivel 2: $3)
-- 3. Si no ves comisiones, revisa los mensajes de error
-- ============================================================================
