-- ============================================
-- TRONDEALER INTEGRATION - SQL SETUP
-- ============================================
-- Este script configura las tablas y funciones RPC
-- para la integración con TronDealer API
-- ============================================

-- 1. Agregar columnas de TronDealer a profiles si no existen
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trondealer_wallet_id UUID,
ADD COLUMN IF NOT EXISTS trondealer_address TEXT,
ADD COLUMN IF NOT EXISTS trondealer_label TEXT;

-- 2. Agregar columnas de TronDealer a wallets si no existen
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS trondealer_wallet_id UUID,
ADD COLUMN IF NOT EXISTS trondealer_address TEXT;

-- 3. Crear tabla para rastrear depósitos de TronDealer
CREATE TABLE IF NOT EXISTS trondealer_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tx_hash TEXT UNIQUE NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC(18, 8) NOT NULL,
  network TEXT NOT NULL,
  block_number BIGINT,
  confirmations INTEGER,
  wallet_label TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(tx_hash)
);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_trondealer_deposits_user_id ON trondealer_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_trondealer_deposits_tx_hash ON trondealer_deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_trondealer_deposits_wallet_label ON trondealer_deposits(wallet_label);
CREATE INDEX IF NOT EXISTS idx_trondealer_deposits_status ON trondealer_deposits(status);

-- 5. Función RPC para procesar depósito desde webhook
CREATE OR REPLACE FUNCTION process_trondealer_deposit(
  p_user_id UUID,
  p_tx_hash TEXT,
  p_from_address TEXT,
  p_to_address TEXT,
  p_asset TEXT,
  p_amount NUMERIC,
  p_network TEXT,
  p_block_number BIGINT,
  p_confirmations INTEGER,
  p_wallet_label TEXT
) RETURNS JSON AS $$
DECLARE
  v_deposit_id UUID;
  v_wallet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  -- Insertar registro del depósito
  INSERT INTO trondealer_deposits (
    user_id, tx_hash, from_address, to_address, asset, amount,
    network, block_number, confirmations, wallet_label, status
  ) VALUES (
    p_user_id, p_tx_hash, p_from_address, p_to_address, p_asset, p_amount,
    p_network, p_block_number, p_confirmations, p_wallet_label, 'pending'
  )
  ON CONFLICT (tx_hash) DO NOTHING
  RETURNING id INTO v_deposit_id;

  -- Si el depósito ya existe, retornar error
  IF v_deposit_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Deposit already processed'
    );
  END IF;

  -- Obtener wallet del usuario
  SELECT id, disponible INTO v_wallet_id, v_new_balance
  FROM wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    -- Crear wallet si no existe
    INSERT INTO wallets (user_id, disponible, invertido, comisiones, retirado)
    VALUES (p_user_id, p_amount, 0, 0, 0)
    RETURNING id INTO v_wallet_id;
    
    v_new_balance := p_amount;
  ELSE
    -- Actualizar balance
    v_new_balance := v_new_balance + p_amount;
    
    UPDATE wallets
    SET disponible = v_new_balance
    WHERE id = v_wallet_id;
  END IF;

  -- Crear transacción de registro
  INSERT INTO transactions (
    user_id, tipo, monto, balance_anterior, balance_nuevo,
    descripcion, referencia
  ) VALUES (
    p_user_id, 'deposit', p_amount, 
    v_new_balance - p_amount, v_new_balance,
    format('Depósito TronDealer: %s %s', p_amount, p_asset),
    p_tx_hash
  );

  -- Marcar depósito como completado
  UPDATE trondealer_deposits
  SET status = 'completed', processed_at = NOW()
  WHERE id = v_deposit_id;

  -- Retornar éxito
  RETURN json_build_object(
    'success', true,
    'deposit_id', v_deposit_id,
    'amount', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función RPC para crear wallet en TronDealer (desde Edge Function)
CREATE OR REPLACE FUNCTION create_trondealer_wallet(
  p_user_id UUID,
  p_trondealer_wallet_id UUID,
  p_address TEXT,
  p_label TEXT
) RETURNS JSON AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Actualizar perfil con datos de TronDealer
  UPDATE profiles
  SET 
    trondealer_wallet_id = p_trondealer_wallet_id,
    trondealer_address = p_address,
    trondealer_label = p_label
  WHERE id = p_user_id
  RETURNING username INTO v_username;

  -- Crear o actualizar wallet
  INSERT INTO wallets (user_id, trondealer_wallet_id, trondealer_address, disponible, invertido, comisiones, retirado)
  VALUES (p_user_id, p_trondealer_wallet_id, p_address, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    trondealer_wallet_id = EXCLUDED.trondealer_wallet_id,
    trondealer_address = EXCLUDED.trondealer_address;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', v_username,
    'wallet_address', p_address
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para obtener depósitos de un usuario
CREATE OR REPLACE FUNCTION get_trondealer_deposits(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  tx_hash TEXT,
  asset TEXT,
  amount NUMERIC,
  network TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id,
    td.tx_hash,
    td.asset,
    td.amount,
    td.network,
    td.status,
    td.created_at,
    td.processed_at
  FROM trondealer_deposits td
  WHERE td.user_id = p_user_id
  ORDER BY td.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Políticas RLS para trondealer_deposits
ALTER TABLE trondealer_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deposits"
  ON trondealer_deposits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage deposits"
  ON trondealer_deposits
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 9. Comentario de documentación
COMMENT ON FUNCTION process_trondealer_deposit IS 
  'Procesa un depósito desde el webhook de TronDealer. Crea registro, actualiza balance y genera transacción.';

COMMENT ON FUNCTION create_trondealer_wallet IS 
  'Crea/actualiza wallet de usuario con datos de TronDealer después de crear wallet vía API.';

COMMENT ON FUNCTION get_trondealer_deposits IS 
  'Obtiene historial de depósitos de TronDealer para un usuario.';
