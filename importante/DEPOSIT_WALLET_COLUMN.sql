-- ============================================================================
-- AGREGAR CAMPO DEPOSIT_WALLET A TABLA WALLETS
-- ============================================================================
-- Este campo almacena la dirección única de depósito BEP20 para cada usuario
-- Permite identificar automáticamente quién realizó un depósito
-- ============================================================================

-- Agregar la columna deposit_wallet
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS deposit_wallet text UNIQUE;

-- Nota: No se genera automáticamente un valor para los usuarios existentes
-- La API de depósitos se encargará de asignar una wallet única cuando el
-- usuario realice su primer depósito o cuando se llame al endpoint correspondiente

-- La columna deposit_wallet:
-- - Es única para cada usuario
-- - Almacena direcciones BEP20 (BSC) comenzando con 0x
-- - Será utilizada por la API de depósitos para identificar al usuario
-- - Permite detectar automáticamente los depósitos y acreditarlos

-- Ejemplo de formato: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

-- ============================================================================
-- ÍNDICE PARA MEJORAR RENDIMIENTO EN BÚSQUEDAS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallets_deposit_wallet ON wallets(deposit_wallet);

-- ============================================================================
-- COMENTARIO DE LA COLUMNA
-- ============================================================================

COMMENT ON COLUMN wallets.deposit_wallet IS 'Dirección única de depósito BEP20 (BSC) para identificar depósitos del usuario';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
