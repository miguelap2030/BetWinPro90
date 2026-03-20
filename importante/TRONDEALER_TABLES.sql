-- ============================================================================
-- TABLAS PARA SISTEMA DE DEPÓSITOS CON TRONDEALER
-- ============================================================================
-- Este script crea las tablas necesarias para integrar con TronDealer API
-- para generación automática de wallets y recepción de webhooks de depósitos
-- ============================================================================

-- ============================================================================
-- 1. TABLA deposit_webhook_logs (AUDITORÍA DE WEBHOOKS)
-- ============================================================================
-- Registra todos los webhooks recibidos de TronDealer
-- Permite auditoría, debugging y prevención de duplicados
-- ============================================================================

CREATE TABLE IF NOT EXISTS deposit_webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash TEXT,
  wallet_address TEXT,
  amount NUMERIC(18, 8),
  currency TEXT DEFAULT 'USDT',
  network TEXT DEFAULT 'BEP20',
  status TEXT, -- 'pending', 'confirmed', 'completed'
  payload JSONB, -- Webhook completo para auditoría
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT unique_tx_hash UNIQUE (tx_hash)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tx_hash ON deposit_webhook_logs(tx_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_wallet ON deposit_webhook_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON deposit_webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON deposit_webhook_logs(created_at);

-- Comentario
COMMENT ON TABLE deposit_webhook_logs IS 'Registro de webhooks de depósitos desde TronDealer para auditoría y prevención de duplicados';

-- ============================================================================
-- 2. ACTUALIZAR TABLA wallets (CAMPO deposit_wallet)
-- ============================================================================
-- Ya debería existir, pero verificamos
-- ============================================================================

-- Agregar columna si no existe
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS deposit_wallet TEXT;

-- Hacer única (si no hay duplicados)
-- Primero limpiamos wallets duplicadas o nulas
DELETE FROM wallets WHERE deposit_wallet IS NULL OR deposit_wallet = '';

-- Ahora agregamos la constraint única
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_deposit_wallet'
  ) THEN
    ALTER TABLE wallets ADD CONSTRAINT unique_deposit_wallet UNIQUE (deposit_wallet);
  END IF;
END $$;

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_wallets_deposit_wallet ON wallets(deposit_wallet);

-- Comentario
COMMENT ON COLUMN wallets.deposit_wallet IS 'Dirección única BEP20 para depósitos del usuario. Generada por TronDealer API.';

-- ============================================================================
-- 3. ACTUALIZAR TABLA deposits (CAMPOS PARA TRONDEALER)
-- ============================================================================
-- Agregamos campos necesarios para rastrear depósitos de TronDealer
-- ============================================================================

-- Agregar columnas si no existen
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'BEP20';
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS webhook_payload JSONB;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet_address ON deposits(wallet_address);

-- Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_deposits_tx_hash'
  ) THEN
    ALTER TABLE deposits ADD CONSTRAINT unique_deposits_tx_hash UNIQUE (tx_hash);
  END IF;
END $$;

-- Comentario
COMMENT ON COLUMN deposits.tx_hash IS 'Hash de transacción en blockchain BEP20';
COMMENT ON COLUMN deposits.wallet_address IS 'Dirección de wallet BEP20 que recibió el depósito';
COMMENT ON COLUMN deposits.network IS 'Red blockchain (BEP20, TRC20, etc.)';
COMMENT ON COLUMN deposits.webhook_payload IS 'Payload completo del webhook para auditoría';

-- ============================================================================
-- 4. FUNCIÓN: register_deposit_webhook
-- ============================================================================
-- Registra un webhook recibido y verifica si ya fue procesado
-- Retorna: TRUE si es nuevo, FALSE si ya existe
-- ============================================================================

CREATE OR REPLACE FUNCTION register_deposit_webhook(
  p_tx_hash TEXT,
  p_wallet_address TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'USDT',
  p_network TEXT DEFAULT 'BEP20',
  p_status TEXT DEFAULT 'confirmed',
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe el tx_hash
  SELECT EXISTS(
    SELECT 1 FROM deposit_webhook_logs WHERE tx_hash = p_tx_hash
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Webhook ya procesado: tx_hash %', p_tx_hash;
  END IF;
  
  -- Insertar nuevo registro
  INSERT INTO deposit_webhook_logs (
    tx_hash,
    wallet_address,
    amount,
    currency,
    network,
    status,
    payload
  ) VALUES (
    p_tx_hash,
    p_wallet_address,
    p_amount,
    p_currency,
    p_network,
    p_status,
    p_payload
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. FUNCIÓN: process_deposit_webhook
-- ============================================================================
-- Procesa un webhook de depósito acreditando el balance al usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION process_deposit_webhook(
  p_tx_hash TEXT,
  p_wallet_address TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'USDT',
  p_network TEXT DEFAULT 'BEP20',
  p_payload JSONB DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
  v_deposit_id UUID;
  v_log_id UUID;
  v_min_amount NUMERIC := 0.50; -- Mínimo de depósito
BEGIN
  -- 1. Validar monto mínimo
  IF p_amount < v_min_amount THEN
    RAISE EXCEPTION 'Monto inferior al mínimo: %. Mínimo: %', p_amount, v_min_amount;
  END IF;
  
  -- 2. Buscar usuario por deposit_wallet
  SELECT w.id, w.user_id
  INTO v_wallet_id, v_user_id
  FROM wallets w
  WHERE w.deposit_wallet = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet no encontrada: %', p_wallet_address;
  END IF;
  
  -- 3. Registrar webhook (valida duplicados)
  v_log_id := register_deposit_webhook(
    p_tx_hash,
    p_wallet_address,
    p_amount,
    p_currency,
    p_network,
    'confirmed',
    p_payload
  );
  
  -- 4. Crear registro en deposits
  INSERT INTO deposits (
    user_id,
    amount,
    currency,
    status,
    payment_method,
    tx_hash,
    wallet_address,
    network,
    webhook_payload,
    confirmed_at,
    completed_at,
    created_at
  ) VALUES (
    v_user_id,
    p_amount,
    p_currency,
    'completed',
    'trondealer',
    p_tx_hash,
    p_wallet_address,
    p_network,
    p_payload,
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_deposit_id;
  
  -- 5. Actualizar wallet - sumar al balance disponible
  UPDATE wallets
  SET 
    balance_disponible = balance_disponible + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id;
  
  -- 6. Crear transacción
  PERFORM create_transaction(
    p_user_id := v_user_id,
    p_type := 'deposit',
    p_amount := p_amount,
    p_description := CONCAT('Depósito BEP20 via TronDealer: ', SUBSTRING(p_tx_hash FROM 1 FOR 10), '...'),
    p_status := 'completed',
    p_reference := 'trondealer_deposit'
  );
  
  -- 7. Distribuir comisiones MLM (si la función existe)
  BEGIN
    PERFORM distribute_deposit_commissions(v_deposit_id);
  EXCEPTION WHEN OTHERS THEN
    -- Si la función no existe, continuar sin comisiones
    NULL;
  END;
  
  -- 8. Marcar webhook como procesado
  UPDATE deposit_webhook_logs
  SET 
    processed = true,
    processed_at = NOW()
  WHERE id = v_log_id;
  
  -- 9. Retornar resultado
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'user_id', v_user_id,
    'deposit_id', v_deposit_id,
    'amount', p_amount,
    'message', 'Depósito procesado exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. FUNCIÓN: get_user_deposit_wallet
-- ============================================================================
-- Obtiene o genera la wallet de depósito para un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_deposit_wallet(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_wallet_id UUID;
BEGIN
  -- Buscar wallet existente
  SELECT w.deposit_wallet, w.id
  INTO v_wallet_address, v_wallet_id
  FROM wallets w
  WHERE w.user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet no encontrada para usuario %', p_user_id;
  END IF;
  
  -- Si ya tiene wallet, retornarla
  IF v_wallet_address IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'success', true,
      'wallet', v_wallet_address,
      'generated', false,
      'message', 'Wallet existente recuperada'
    );
  END IF;
  
  -- Retornar null para que el frontend llame a la Edge Function
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'wallet', NULL,
    'generated', false,
    'message', 'El usuario no tiene wallet. Generar vía Edge Function.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. FUNCIÓN: update_user_deposit_wallet
-- ============================================================================
-- Actualiza la wallet de depósito para un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_deposit_wallet(
  p_user_id UUID,
  p_wallet_address TEXT
)
RETURNS JSON AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Validar formato de wallet BEP20 (comienza con 0x)
  IF p_wallet_address NOT LIKE '0x%' THEN
    RAISE EXCEPTION 'Dirección BEP20 inválida. Debe comenzar con 0x';
  END IF;
  
  -- Verificar si la wallet ya existe en otro usuario
  SELECT EXISTS(
    SELECT 1 FROM wallets WHERE deposit_wallet = p_wallet_address
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE EXCEPTION 'La wallet % ya está asignada a otro usuario', p_wallet_address;
  END IF;
  
  -- Actualizar wallet
  UPDATE wallets
  SET 
    deposit_wallet = p_wallet_address,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'wallet', p_wallet_address,
    'message', 'Wallet actualizada exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS en deposit_webhook_logs
ALTER TABLE deposit_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo administradores pueden ver logs
DROP POLICY IF EXISTS "Admins pueden ver deposit_webhook_logs" ON deposit_webhook_logs;
CREATE POLICY "Admins pueden ver deposit_webhook_logs"
  ON deposit_webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Política: Edge functions pueden insertar (usando service role)
-- No se necesita política explícita para INSERT porque las edge functions usan service_role_key

-- ============================================================================
-- 9. VISTA: dashboard de depósitos para admin
-- ============================================================================

CREATE OR REPLACE VIEW admin_deposit_dashboard AS
SELECT
  COUNT(*) FILTER (WHERE processed = true) as total_procesados,
  COUNT(*) FILTER (WHERE processed = false) as total_pendientes,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as total_errores,
  SUM(amount) FILTER (WHERE processed = true) as monto_total_procesado,
  SUM(amount) FILTER (WHERE processed = false) as monto_total_pendiente,
  COUNT(DISTINCT wallet_address) as wallets_unicas,
  COUNT(DISTINCT tx_hash) as transacciones_unicas
FROM deposit_webhook_logs;

-- ============================================================================
-- 10. DATOS INICIALES
-- ============================================================================

-- Actualizar wallets existentes sin deposit_wallet
-- (Se generarán cuando el usuario las necesite vía Edge Function)

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
