-- ============================================================================
-- CORRECCIÓN SISTEMA DE COMISIONES MLM
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- ============================================================================
-- 1. ELIMINAR FUNCIONES EXISTENTES
-- ============================================================================

DROP FUNCTION IF EXISTS distribute_deposit_commissions(UUID);
DROP FUNCTION IF EXISTS get_upline_sponsors(UUID, INT);

-- ============================================================================
-- 2. CREAR FUNCIÓN GET_UPLINE_SPONSORS CORREGIDA
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
    -- Obtener el sponsor directo del usuario
    SELECT p.sponsor_id INTO current_sponsor_id
    FROM profiles p
    WHERE p.id = p_user_id;

    -- Recorrer la cadena de sponsors
    WHILE current_sponsor_id IS NOT NULL AND current_level <= p_max_level LOOP
        RETURN QUERY
        SELECT
            sp.id AS sponsor_id,
            sp.username,
            current_level AS level
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        -- Obtener el siguiente sponsor
        SELECT sp.sponsor_id INTO current_sponsor_id
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        current_level := current_level + 1;
    END LOOP;
END;
$$;

-- ============================================================================
-- 3. CREAR FUNCIÓN DISTRIBUTE_DEPOSIT_COMMISSIONS CORREGIDA
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
    -- Obtener información del depósito
    SELECT * INTO v_deposit
    FROM deposits d
    WHERE d.id = p_deposit_id
      AND d.status = 'completed';

    -- Si el depósito no existe o no está completado, salir
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
            UPDATE wallets w
            SET balance_disponible = w.balance_disponible + v_commission,
                total_comisiones = w.total_comisiones + v_commission
            WHERE w.user_id = v_upline.sponsor_id;

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
-- 4. RECREAR TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();

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

        -- DISTRIBUIR COMISIONES MLM
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
-- 5. PROBAR CON EL DEPÓSITO EXISTENTE DE ASA4
-- ============================================================================

SELECT 
    'EJECUTANDO DISTRIBUCIÓN PARA DEPÓSITO DE ASA4' AS estado;

SELECT * FROM distribute_deposit_commissions('57a6f744-c83a-4bd9-9e56-1b0cc34d4e87');

-- ============================================================================
-- 6. VERIFICAR RESULTADOS
-- ============================================================================

SELECT 
    'COMISIONES CREADAS' AS estado,
    mc.level,
    p.username AS recibe_comision,
    fp.username AS generado_por,
    mc.amount AS monto,
    mc.percentage
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
JOIN profiles fp ON mc.from_user_id = fp.id
ORDER BY mc.level;

SELECT 
    'WALLET DEL SPONSOR ACTUALIZADA' AS estado,
    p.username,
    w.balance_disponible,
    w.total_comisiones
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.username = 'asa3';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
