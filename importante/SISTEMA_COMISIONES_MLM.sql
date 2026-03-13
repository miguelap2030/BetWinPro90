-- ============================================================================
-- SISTEMA DE COMISIONES MLM - 5% N1, 3% N2, 1% N3
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================
-- Este sistema distribuye comisiones cuando un depósito es completado:
-- - 5% al sponsor directo (Nivel 1)
-- - 3% al sponsor del sponsor (Nivel 2)
-- - 1% al sponsor del sponsor del sponsor (Nivel 3)
-- ============================================================================

-- ============================================================================
-- 1. TABLA MLM_COMMISSIONS (si no existe)
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

CREATE INDEX IF NOT EXISTS idx_mlm_user ON mlm_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mlm_from_user ON mlm_commissions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_mlm_level ON mlm_commissions(level);
CREATE INDEX IF NOT EXISTS idx_mlm_type ON mlm_commissions(type);
CREATE INDEX IF NOT EXISTS idx_mlm_paid ON mlm_commissions(is_paid) WHERE is_paid = FALSE;

-- ============================================================================
-- 2. FUNCIÓN PARA OBTENER UPLINE (SPONSORS ASCENDENTES)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_upline_sponsors(p_user_id UUID, p_max_level INT DEFAULT 3)
RETURNS TABLE (
    sponsor_id UUID,
    username TEXT,
    email TEXT,
    level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_sponsor_id UUID;
    current_level INT := 1;
BEGIN
    -- Obtener el sponsor directo del usuario
    SELECT sponsor_id INTO current_sponsor_id
    FROM profiles
    WHERE id = p_user_id;

    -- Recorrer la cadena de sponsors hasta max_level o hasta que no haya más sponsors
    WHILE current_sponsor_id IS NOT NULL AND current_level <= p_max_level LOOP
        RETURN QUERY
        SELECT
            p.id AS sponsor_id,
            p.username,
            p.email,
            current_level AS level
        FROM profiles p
        WHERE p.id = current_sponsor_id;

        -- Obtener el siguiente sponsor
        SELECT sponsor_id INTO current_sponsor_id
        FROM profiles
        WHERE id = current_sponsor_id;

        current_level := current_level + 1;
    END LOOP;
END;
$$;

-- ============================================================================
-- 3. FUNCIÓN PARA DISTRIBUIR COMISIONES POR DEPÓSITO
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
    v_total_distributed INT := 0;
BEGIN
    -- Obtener información del depósito
    SELECT * INTO v_deposit
    FROM deposits
    WHERE id = p_deposit_id
      AND status = 'completed';

    -- Si el depósito no existe o no está completado, salir
    IF v_deposit IS NULL THEN
        RETURN;
    END IF;

    -- Obtener upline (sponsors ascendentes hasta nivel 3)
    FOR v_upline IN SELECT * FROM get_upline_sponsors(v_deposit.user_id, 3) LOOP
        -- Determinar porcentaje según nivel
        CASE v_upline.level
            WHEN 1 THEN v_percentage := 5.00;  -- 5% nivel 1
            WHEN 2 THEN v_percentage := 3.00;  -- 3% nivel 2
            WHEN 3 THEN v_percentage := 1.00;  -- 1% nivel 3
            ELSE v_percentage := 0.00;
        END CASE;

        -- Calcular comisión
        v_commission := v_deposit.amount * (v_percentage / 100);

        -- Solo distribuir si la comisión es mayor a 0
        IF v_commission > 0 THEN
            -- Insertar comisión
            INSERT INTO mlm_commissions (
                user_id,
                from_user_id,
                level,
                type,
                amount,
                percentage,
                related_deposit_id,
                is_paid
            ) VALUES (
                v_upline.sponsor_id,
                v_deposit.user_id,
                v_upline.level,
                'deposit',
                v_commission,
                v_percentage,
                p_deposit_id,
                TRUE
            );

            -- Actualizar wallet del sponsor
            UPDATE wallets
            SET balance_disponible = balance_disponible + v_commission,
                total_comisiones = total_comisiones + v_commission
            WHERE user_id = v_upline.sponsor_id;

            -- Retornar información
            RETURN QUERY
            SELECT
                v_upline.level,
                v_upline.username,
                v_commission,
                TRUE AS success;

            v_total_distributed := v_total_distributed + 1;
        END IF;
    END LOOP;

    -- Si no se distribuyó nada, retornar NULL
    IF v_total_distributed = 0 THEN
        RETURN;
    END IF;
END;
$$;

-- ============================================================================
-- 4. TRIGGER PARA DISTRIBUIR COMISIONES AUTOMÁTICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo ejecutar cuando el depósito cambia a 'completed'
    IF NEW.status = 'completed' 
       AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Actualizar wallet del usuario que depositó
        INSERT INTO wallets (user_id, balance_invertido)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance_invertido = wallets.balance_invertido + NEW.amount,
            updated_at = NOW();

        -- DISTRIBUIR COMISIONES MLM
        PERFORM distribute_deposit_commissions(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe
DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;

-- Crear trigger
CREATE TRIGGER trg_deposit_completed
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- ============================================================================
-- 5. FUNCIÓN PARA VER COMISIONES POR USUARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_commissions_by_user(p_user_id UUID)
RETURNS TABLE (
    commission_id UUID,
    from_username TEXT,
    level INT,
    type TEXT,
    amount NUMERIC,
    percentage NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mc.id AS commission_id,
        p.username AS from_username,
        mc.level::INT,
        mc.type,
        mc.amount,
        mc.percentage,
        mc.created_at
    FROM mlm_commissions mc
    JOIN profiles p ON mc.from_user_id = p.id
    WHERE mc.user_id = p_user_id
    ORDER BY mc.created_at DESC;
END;
$$;

-- ============================================================================
-- 6. VISTA PARA RESUMEN DE COMISIONES
-- ============================================================================

CREATE OR REPLACE VIEW v_commission_summary AS
SELECT
    p.id AS user_id,
    p.username,
    COUNT(mc.id) AS total_commissions,
    COALESCE(SUM(mc.amount), 0) AS total_earned,
    COALESCE(SUM(CASE WHEN mc.level = 1 THEN mc.amount ELSE 0 END), 0) AS level_1_earned,
    COALESCE(SUM(CASE WHEN mc.level = 2 THEN mc.amount ELSE 0 END), 0) AS level_2_earned,
    COALESCE(SUM(CASE WHEN mc.level = 3 THEN mc.amount ELSE 0 END), 0) AS level_3_earned
FROM profiles p
LEFT JOIN mlm_commissions mc ON p.id = mc.user_id
GROUP BY p.id, p.username;

-- ============================================================================
-- 7. PERMISOS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_upline_sponsors TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_deposit_commissions TO authenticated;
GRANT EXECUTE ON FUNCTION get_commissions_by_user TO authenticated;
GRANT SELECT ON v_commission_summary TO authenticated;

-- ============================================================================
-- 8. VERIFICACIÓN
-- ============================================================================

-- Ver triggers
SELECT 
    tgname AS trigger_name,
    tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'trg_deposit_completed';

-- Ver funciones
SELECT 
    proname AS function_name
FROM pg_proc
WHERE proname IN (
    'get_upline_sponsors',
    'distribute_deposit_commissions',
    'get_commissions_by_user',
    'trigger_deposit_completed'
);

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

-- Ejecutar manualmente para un depósito:
-- SELECT * FROM distribute_deposit_commissions('DEPOSIT_ID_AQUI');

-- Ver comisiones de un usuario:
-- SELECT * FROM get_commissions_by_user('USER_ID_AQUI');

-- Ver resumen de comisiones:
-- SELECT * FROM v_commission_summary ORDER BY total_earned DESC;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
