-- ============================================================================
-- SISTEMA DE COMISIONES MLM - VERSIÓN CORREGIDA
-- ============================================================================
-- Este script:
-- 1. Elimina triggers y funciones existentes
-- 2. Crea función para obtener upline
-- 3. Crea función para distribuir comisiones (sin tabla de control)
-- 4. Crea trigger que se ejecuta solo una vez
-- 5. Inserta en transactions para que se muestre en el historial
-- ============================================================================

-- ============================================================================
-- 1. LIMPIEZA INICIAL
-- ============================================================================

DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();
DROP FUNCTION IF EXISTS distribute_deposit_commissions(UUID);
DROP TABLE IF EXISTS mlm_commissions_processed CASCADE;

-- ============================================================================
-- 2. FUNCIÓN GET_UPLINE_SPONSORS
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
-- 3. FUNCIÓN DISTRIBUTE_DEPOSIT_COMMISSIONS
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
    v_existing_commission RECORD;
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
            -- VERIFICAR si ya existe esta comisión para evitar duplicados
            SELECT * INTO v_existing_commission
            FROM mlm_commissions mc
            WHERE mc.user_id = v_upline.sponsor_id
              AND mc.from_user_id = v_deposit.user_id
              AND mc.level = v_upline.level
              AND mc.related_deposit_id = p_deposit_id;

            IF v_existing_commission IS NULL THEN
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

                -- Actualizar wallet del sponsor
                UPDATE wallets w
                SET 
                    balance_disponible = w.balance_disponible + v_commission,
                    total_comisiones = w.total_comisiones + v_commission
                WHERE w.user_id = v_upline.sponsor_id;

                -- Retornar información
                RETURN QUERY
                SELECT
                    v_upline.level,
                    v_upline.username,
                    v_commission,
                    TRUE AS success;
            ELSE
                RAISE NOTICE 'Comisión ya existe para sponsor %, nivel %, deposit %', 
                    v_upline.sponsor_id, v_upline.level, p_deposit_id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 4. TRIGGER PARA DEPOSITOS COMPLETADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo ejecutar cuando el depósito cambia a 'completed'
    -- Verificar que NO estaba ya 'completed' antes
    IF NEW.status = 'completed'
       AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

        -- Actualizar wallet del usuario que depositó
        INSERT INTO wallets (user_id, balance_invertido)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance_invertido = wallets.balance_invertido + NEW.amount;

        -- DISTRIBUIR COMISIONES MLM
        PERFORM distribute_deposit_commissions(NEW.id);
        
        RAISE NOTICE 'Comisiones distribuidas para depósito: %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposit_completed
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- ============================================================================
-- 5. RECUPERAR COMISIONES NO ACREDITADAS
-- ============================================================================

-- Buscar depósitos completados que no tienen comisiones distribuidas
DO $$
DECLARE
    v_deposit RECORD;
    v_result RECORD;
BEGIN
    FOR v_deposit IN 
        SELECT d.* FROM deposits d
        WHERE d.status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM mlm_commissions mc 
            WHERE mc.related_deposit_id = d.id
        )
    LOOP
        RAISE NOTICE 'Procesando depósito sin comisiones: %', v_deposit.id;
        SELECT * INTO v_result FROM distribute_deposit_commissions(v_deposit.id);
    END LOOP;
END $$;

-- ============================================================================
-- 6. VERIFICAR RESULTADOS
-- ============================================================================

SELECT 
    'COMISIONES EXISTENTES' AS reporte,
    COUNT(*) as total_comisiones,
    SUM(amount) as monto_total
FROM mlm_commissions;

SELECT 
    'TRANSACCIONES DE COMISIONES' AS reporte,
    COUNT(*) as total_transacciones,
    SUM(amount) as monto_total
FROM transactions
WHERE type = 'commission';

SELECT 
    'WALLETS CON COMISIONES' AS reporte,
    w.user_id,
    p.username,
    w.total_comisiones
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE w.total_comisiones > 0
ORDER BY w.total_comisiones DESC;
