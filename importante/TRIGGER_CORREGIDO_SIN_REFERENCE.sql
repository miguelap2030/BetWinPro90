-- ============================================================================
-- CORRECCIÓN FINAL - TRIGGER PARA INSERT Y UPDATE
-- ============================================================================
-- Este trigger funciona tanto para INSERTs como UPDATEs de depósitos
-- Sin columna 'reference' en transactions
-- ============================================================================

-- 1. ELIMINAR TRIGGER Y FUNCIÓN EXISTENTE
DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();
DROP FUNCTION IF EXISTS distribute_deposit_commissions(UUID);

-- 2. CREAR FUNCIÓN GET_UPLINE_SPONSORS (si no existe)
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

-- 3. CREAR FUNCIÓN DISTRIBUTE_DEPOSIT_COMMISSIONS (SIN COLUMNA REFERENCE)
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

                -- Insertar transacción en transactions (SIN columna reference)
                INSERT INTO transactions (
                    user_id,
                    type,
                    amount,
                    description
                ) VALUES (
                    v_upline.sponsor_id,
                    'commission',
                    v_commission,
                    'Comisión MLM nivel ' || v_upline.level || ' - Referido: ' || COALESCE(v_deposit.user_id::text, 'N/A')
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

-- 4. CREAR TRIGGER QUE FUNCIONA EN INSERT Y UPDATE
CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Determinar el status anterior (NULL para INSERTs)
    v_old_status := CASE 
        WHEN TG_OP = 'INSERT' THEN NULL
        ELSE OLD.status
    END;

    -- Ejecutar solo si el status es 'completed' y antes no lo era
    IF NEW.status = 'completed'
       AND (v_old_status IS NULL OR v_old_status != 'completed') THEN

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

-- 5. CREAR TRIGGER PARA INSERT Y UPDATE
CREATE TRIGGER trg_deposit_completed
    AFTER INSERT OR UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- 6. VERIFICAR QUE EL TRIGGER SE CREÓ CORRECTAMENTE
SELECT 
    'TRIGGER CREADO' AS estado,
    tgname AS nombre,
    tgenabled AS enabled,
    (SELECT relname FROM pg_class WHERE oid = tgrelid) AS tabla
FROM pg_trigger
WHERE tgname = 'trg_deposit_completed';

-- 7. PROCESAR DEPÓSITOS EXISTENTES QUE NO TIENEN COMISIONES
DO $$
DECLARE
    v_deposit RECORD;
    v_result RECORD;
    v_total_procesados INT := 0;
BEGIN
    FOR v_deposit IN 
        SELECT d.* FROM deposits d
        WHERE d.status = 'completed'
        AND NOT EXISTS (
            SELECT 1 FROM mlm_commissions mc 
            WHERE mc.related_deposit_id = d.id
        )
    LOOP
        RAISE NOTICE 'Procesando depósito sin comisiones: % (user: %, amount: %)', 
            v_deposit.id, v_deposit.user_id, v_deposit.amount;
        SELECT * INTO v_result FROM distribute_deposit_commissions(v_deposit.id);
        v_total_procesados := v_total_procesados + 1;
    END LOOP;
    
    RAISE NOTICE 'Total de depósitos procesados: %', v_total_procesados;
END $$;

-- 8. VERIFICAR RESULTADOS FINALES
SELECT 
    'RESUMEN FINAL' AS estado,
    (SELECT COUNT(*) FROM deposits WHERE status = 'completed') AS depositos_completados,
    (SELECT COUNT(*) FROM mlm_commissions) AS comisiones_totales,
    (SELECT COUNT(*) FROM transactions WHERE type = 'commission') AS transacciones_comision,
    (SELECT SUM(total_comisiones) FROM wallets) AS total_comisiones_acumuladas;
