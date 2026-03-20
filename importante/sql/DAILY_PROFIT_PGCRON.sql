-- ============================================
-- DAILY PROFIT DISTRIBUTION - 3% Daily con pg_cron
-- ============================================
-- Esta función distribuye el 3% diario sobre el balance invertido
-- a todos los usuarios activos con balance_invertido > 0
-- Se ejecuta automáticamente todos los días a las 00:00 UTC
-- ============================================

-- ============================================
-- 1. CREAR FUNCIÓN SQL
-- ============================================

-- Eliminar función si existe
DROP FUNCTION IF EXISTS distribute_daily_profit() CASCADE;

-- Crear función para distribuir ganancias diarias del 3%
CREATE OR REPLACE FUNCTION distribute_daily_profit()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  profit_amount NUMERIC(18,2);
BEGIN
  -- Iterar sobre todos los usuarios activos con balance invertido > 0
  FOR user_record IN 
    SELECT 
      w.id as wallet_id,
      w.user_id,
      w.balance_invertido,
      p.username,
      p.email
    FROM wallets w
    JOIN profiles p ON w.user_id = p.id
    WHERE p.is_active = true 
      AND w.balance_invertido > 0
  LOOP
    -- Calcular el 3% del balance invertido
    profit_amount := ROUND(user_record.balance_invertido * 0.03, 2);
    
    -- Solo procesar si hay ganancia > 0
    IF profit_amount > 0 THEN
      -- Actualizar wallet: agregar ganancia al balance disponible
      UPDATE wallets 
      SET 
        balance_disponible = balance_disponible + profit_amount,
        profit_daily = profit_daily + profit_amount,
        updated_at = NOW()
      WHERE id = user_record.wallet_id;
      
      -- Crear registro en transactions
      INSERT INTO transactions (
        id,
        user_id,
        type,
        amount,
        description,
        reference,
        created_at
      ) VALUES (
        gen_random_uuid(),
        user_record.user_id,
        'profit',
        profit_amount,
        CONCAT('Ganancia diaria 3% - Inversión: $', user_record.balance_invertido),
        'daily_profit_auto',
        NOW()
      );
      
      RAISE NOTICE 'Usuario % (%) - Inversión: $%, Ganancia: $%', 
        user_record.username, 
        user_record.email,
        user_record.balance_invertido,
        profit_amount;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Distribución de ganancias diarias completada exitosamente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permisos de ejecución
GRANT EXECUTE ON FUNCTION distribute_daily_profit() TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_daily_profit() TO anon;

-- Comentario en la función
COMMENT ON FUNCTION distribute_daily_profit IS 
  'Distribuye el 3% diario sobre el balance invertido a usuarios activos';


-- ============================================
-- 2. CONFIGURAR CRON JOB CON pg_cron
-- ============================================

-- Eliminar job existente si existe
SELECT cron.unschedule('daily-profit-distribution');

-- Crear cron job para ejecutar todos los días a las 00:00 UTC
SELECT cron.schedule(
  'daily-profit-distribution',           -- nombre del job
  '0 0 * * *',                           -- cron expression (00:00 UTC diario)
  'SELECT distribute_daily_profit()'     -- comando SQL a ejecutar
);


-- ============================================
-- 3. FUNCIONES HELPER (para monitoreo)
-- ============================================

-- Función para obtener todas las wallets activas
DROP FUNCTION IF EXISTS get_all_active_wallets() CASCADE;
CREATE OR REPLACE FUNCTION get_all_active_wallets()
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  is_active boolean,
  balance_invertido numeric,
  balance_disponible numeric,
  profit_daily numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.user_id,
    p.username,
    p.email,
    p.is_active,
    w.balance_invertido,
    w.balance_disponible,
    w.profit_daily
  FROM wallets w
  JOIN profiles p ON w.user_id = p.id
  WHERE p.is_active = true 
    AND w.balance_invertido > 0
  ORDER BY w.balance_invertido DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_active_wallets() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_active_wallets() TO anon;


-- Función para obtener transacciones recientes de profit
DROP FUNCTION IF EXISTS get_recent_profit_transactions(integer) CASCADE;
CREATE OR REPLACE FUNCTION get_recent_profit_transactions(p_limit integer DEFAULT 10)
RETURNS TABLE (
  transaction_id uuid,
  user_id uuid,
  username text,
  amount numeric,
  description text,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    p.username,
    t.amount,
    t.description,
    t.created_at
  FROM transactions t
  JOIN profiles p ON t.user_id = p.id
  WHERE t.type = 'profit'
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_recent_profit_transactions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_profit_transactions(integer) TO anon;


-- ============================================
-- 4. COMANDOS DE VERIFICACIÓN
-- ============================================

-- Ver cron jobs configurados:
-- SELECT jobid, jobname, schedule, active FROM cron.job;

-- Ver próxima ejecución:
-- SELECT * FROM cron.job_run_details WHERE jobid = 1 ORDER BY start_time DESC LIMIT 1;

-- Ejecutar manualmente para testing:
-- SELECT distribute_daily_profit();

-- Ver resultados:
-- SELECT * FROM get_all_active_wallets();
-- SELECT * FROM get_recent_profit_transactions(10);

-- ============================================
-- 5. COMANDOS DE ADMINISTRACIÓN
-- ============================================

-- Pausar cron job:
-- SELECT cron.alter_job(1, active := false);

-- Reactivar cron job:
-- SELECT cron.alter_job(1, active := true);

-- Eliminar cron job:
-- SELECT cron.unschedule('daily-profit-distribution');

-- Ver historial de ejecuciones:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
