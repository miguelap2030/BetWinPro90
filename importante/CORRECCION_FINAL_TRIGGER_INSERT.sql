-- ============================================================================
-- CORRECCIÓN FINAL - TRIGGER PARA INSERT Y UPDATE
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================
-- El trigger ahora funcionará para:
-- 1. INSERT con status='completed' (depósito directo)
-- 2. UPDATE de pending a completed
-- ============================================================================

-- 1. ELIMINAR TRIGGER Y FUNCIÓN EXISTENTES
DROP TRIGGER IF EXISTS trg_deposit_completed ON deposits;
DROP FUNCTION IF EXISTS trigger_deposit_completed();

-- 2. CREAR FUNCIÓN CORREGIDA - FUNCIONA PARA INSERT Y UPDATE
CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_should_process BOOLEAN := FALSE;
BEGIN
    -- Determinar si debemos procesar comisiones
    IF TG_OP = 'INSERT' THEN
        -- Para INSERT: procesar si status es 'completed'
        IF NEW.status = 'completed' THEN
            v_should_process := TRUE;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Para UPDATE: procesar si cambia de pending a completed
        IF NEW.status = 'completed' 
           AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
            v_should_process := TRUE;
        END IF;
    END IF;

    -- Si debemos procesar, ejecutar lógica
    IF v_should_process THEN
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

-- 3. CREAR TRIGGER PARA INSERT Y UPDATE
CREATE TRIGGER trg_deposit_completed
    AFTER INSERT OR UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- 4. VERIFICAR TRIGGER CREADO
SELECT 
    'TRIGGER CREADO' AS estado,
    tgname AS nombre,
    tgenabled AS enabled,
    pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgname = 'trg_deposit_completed';

-- 5. PROBAR CON DEPÓSITO INSERTADO DIRECTAMENTE COMO COMPLETED
-- Usamos el depósito que ya creamos antes
SELECT 
    'PROBANDO CON DEPÓSITO EXISTENTE' AS estado,
    id,
    amount,
    status
FROM deposits
WHERE id = 'f3ccfaa0-2f60-441e-8eeb-caa84e2b9043';

-- Ejecutar manualmente para verificar
SELECT * FROM distribute_deposit_commissions('f3ccfaa0-2f60-441e-8eeb-caa84e2b9043');

-- 6. VERIFICAR RESULTADOS
SELECT 
    'COMISIONES GENERADAS' AS estado,
    mc.level,
    p.username AS recibe,
    mc.amount AS monto,
    mc.percentage
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
WHERE mc.related_deposit_id = 'f3ccfaa0-2f60-441e-8eeb-caa84e2b9043'
ORDER BY mc.level;

-- ============================================================================
-- INSTRUCCIONES:
-- Después de ejecutar este script, los depósitos creados directamente
-- como 'completed' también generarán comisiones automáticamente
-- ============================================================================
