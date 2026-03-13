-- ============================================================================
-- CORRECCIÓN DEFINITIVA - TOTAL_COMISIONES EN WALLETS
-- ============================================================================
-- Este script:
-- 1. Elimina triggers y funciones existentes
-- 2. Crea una tabla de control para evitar comisiones duplicadas
-- 3. Recrea el trigger con verificación de duplicados
-- 4. Recalcula total_comisiones correctamente
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE CONTROL PARA EVITAR DUPLICADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mlm_commissions_processed (
    deposit_id UUID,
    user_id UUID,
    level INT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (deposit_id, user_id, level)
);

-- ============================================================================
-- 2. ELIMINAR FUNCIONES Y TRIGGERS EXISTENTES
-- ============================================================================

DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();
DROP FUNCTION IF EXISTS distribute_deposit_commissions(UUID);

-- ============================================================================
-- 3. CREAR FUNCIÓN GET_UPLINE_SPONSORS (si no existe)
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
    SELECT p.sponsor_id INTO current_sponsor_id
    FROM profiles p
    WHERE p.id = p_user_id;

    WHILE current_sponsor_id IS NOT NULL AND current_level <= p_max_level LOOP
        RETURN QUERY
        SELECT
            sp.id AS sponsor_id,
            sp.username,
            current_level AS level
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        SELECT sp.sponsor_id INTO current_sponsor_id
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        current_level := current_level + 1;
    END LOOP;
END;
$$;

-- ============================================================================
-- 4. CREAR FUNCIÓN DISTRIBUTE_DEPOSIT_COMMISSIONS CORREGIDA
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
    v_already_processed BOOLEAN;
BEGIN
    -- Obtener información del depósito
    SELECT * INTO v_deposit
    FROM deposits d
    WHERE d.id = p_deposit_id
      AND d.status = 'completed';

    IF v_deposit IS NULL THEN
        RAISE NOTICE 'Depósito no encontrado o no está completado: %', p_deposit_id;
        RETURN;
    END IF;

    -- Obtener upline (sponsors ascendentes hasta nivel 3)
    FOR v_upline IN SELECT * FROM get_upline_sponsors(v_deposit.user_id, 3) LOOP
        -- VERIFICAR SI YA SE PROCESÓ ESTA COMISIÓN
        SELECT EXISTS (
            SELECT 1 FROM mlm_commissions_processed mcp
            WHERE mcp.deposit_id = p_deposit_id
              AND mcp.user_id = v_upline.sponsor_id
              AND mcp.level = v_upline.level
        ) INTO v_already_processed;

        IF v_already_processed THEN
            RAISE NOTICE 'Comisión ya procesada para sponsor %, nivel %, deposit %', 
                v_upline.sponsor_id, v_upline.level, p_deposit_id;
            CONTINUE;
        END IF;

        -- Determinar porcentaje según nivel
        CASE v_upline.level
            WHEN 1 THEN v_percentage := 5.00;  -- 5% nivel 1
            WHEN 2 THEN v_percentage := 3.00;  -- 3% nivel 2
            WHEN 3 THEN v_percentage := 1.00;  -- 1% nivel 3
            ELSE v_percentage := 0.00;
        END CASE;

        -- Calcular comisión
        v_commission := v_deposit.amount * (v_percentage / 100);

        IF v_commission > 0 THEN
            -- Insertar comisión en mlm_commissions
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

            -- Insertar transacción en transactions
            INSERT INTO transactions (
                user_id,
                type,
                amount,
                description,
                reference
            ) VALUES (
                v_upline.sponsor_id,
                'commission',
                v_commission,
                'Comisión MLM nivel ' || v_upline.level || ' - Referido: ' || COALESCE(v_deposit.user_id::text, 'N/A'),
                'MLM-L' || v_upline.level || '-DEP-' || SUBSTRING(p_deposit_id::text FROM 1 FOR 8)
            );

            -- Actualizar wallet del sponsor - SOLO UNA VEZ POR COMISIÓN
            UPDATE wallets w
            SET 
                balance_disponible = w.balance_disponible + v_commission,
                total_comisiones = w.total_comisiones + v_commission
            WHERE w.user_id = v_upline.sponsor_id;

            -- MARCAR COMO PROCESADA
            INSERT INTO mlm_commissions_processed (deposit_id, user_id, level)
            VALUES (p_deposit_id, v_upline.sponsor_id, v_upline.level);

            -- Retornar información
            RETURN QUERY
            SELECT
                v_upline.level,
                v_upline.username,
                v_commission,
                TRUE AS success;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 5. CREAR TRIGGER CORREGIDO
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
        SET balance_invertido = wallets.balance_invertido + NEW.amount;

        -- DISTRIBUIR COMISIONES MLM (con verificación de duplicados)
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
-- 6. LIMPIAR DATOS DUPLICADOS ACTUALES
-- ============================================================================

-- Resetear total_comisiones a 0 para todos los usuarios
UPDATE wallets SET total_comisiones = 0;

-- Recalcular total_comisiones sumando de mlm_commissions (sin duplicar)
UPDATE wallets w
SET total_comisiones = COALESCE(
    (SELECT SUM(mc.amount) 
     FROM mlm_commissions mc 
     WHERE mc.user_id = w.user_id 
       AND mc.is_paid = true),
    0
);

-- ============================================================================
-- 7. VERIFICAR RESULTADOS
-- ============================================================================

SELECT 
    'TOTAL COMISIONES POR USUARIO' AS reporte,
    w.user_id,
    p.username,
    w.total_comisiones,
    (SELECT COUNT(*) FROM mlm_commissions mc WHERE mc.user_id = w.user_id) as comisiones_count
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE w.total_comisiones > 0
ORDER BY w.total_comisiones DESC;

-- ============================================================================
-- 8. VERIFICAR QUE NO HAY DUPLICADOS EN LA TABLA DE CONTROL
-- ============================================================================

SELECT 
    'COMISIONES PROCESADAS (DEBERÍA COINCIDIR CON MLM_COMMISSIONS)' AS verificacion,
    COUNT(*) as total_procesadas
FROM mlm_commissions_processed;

SELECT 
    'COMISIONES EN MLM_COMMISSIONS' AS verificacion,
    COUNT(*) as total_comisiones
FROM mlm_commissions;
