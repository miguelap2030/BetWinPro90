-- ============================================================================
-- TABLA ADMIN_DASHBOARD PARA PANEL DE ADMINISTRACIÓN
-- ============================================================================
-- Versión corregida basada en la estructura real de la BD de BetWinPro90
-- ============================================================================

-- ============================================================================
-- 1. ELIMINAR OBJETOS EXISTENTES (SI EXISTEN)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_admin_dashboard_profiles ON profiles;
DROP TRIGGER IF EXISTS trg_admin_dashboard_wallets ON wallets;
DROP TRIGGER IF EXISTS trg_admin_dashboard_deposits ON deposits;
DROP TRIGGER IF EXISTS trg_admin_dashboard_withdrawals ON withdrawals;
DROP TRIGGER IF EXISTS trg_admin_dashboard_commissions ON mlm_commissions;
DROP TRIGGER IF EXISTS trg_admin_dashboard_transactions ON transactions;

DROP FUNCTION IF EXISTS update_admin_dashboard() CASCADE;
DROP FUNCTION IF EXISTS get_admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS refresh_admin_dashboard() CASCADE;
DROP FUNCTION IF EXISTS refresh_admin_dashboard_manual() CASCADE;

DROP TABLE IF EXISTS admin_dashboard CASCADE;

-- ============================================================================
-- 2. CREAR TABLA ADMIN_DASHBOARD
-- ============================================================================

CREATE TABLE admin_dashboard (
  id SERIAL PRIMARY KEY,
  
  -- Estadísticas de Usuarios
  total_usuarios INTEGER DEFAULT 0,
  usuarios_activos INTEGER DEFAULT 0,
  usuarios_inactivos INTEGER DEFAULT 0,
  nuevos_usuarios_hoy INTEGER DEFAULT 0,
  nuevos_usuarios_semana INTEGER DEFAULT 0,
  
  -- Estadísticas Financieras
  total_invertido NUMERIC(20, 2) DEFAULT 0,
  total_disponible NUMERIC(20, 2) DEFAULT 0,
  total_retirado NUMERIC(20, 2) DEFAULT 0,
  total_comisiones NUMERIC(20, 2) DEFAULT 0,
  profit_distribuido NUMERIC(20, 2) DEFAULT 0,
  
  -- Estadísticas de Depósitos
  total_depositos NUMERIC(20, 2) DEFAULT 0,
  depositos_pendientes INTEGER DEFAULT 0,
  depositos_pendientes_monto NUMERIC(20, 2) DEFAULT 0,
  depositos_hoy NUMERIC(20, 2) DEFAULT 0,
  depositos_hoy_count INTEGER DEFAULT 0,
  
  -- Estadísticas de Retiros
  total_retiros NUMERIC(20, 2) DEFAULT 0,
  retiros_pendientes INTEGER DEFAULT 0,
  retiros_pendientes_monto NUMERIC(20, 2) DEFAULT 0,
  retiros_hoy NUMERIC(20, 2) DEFAULT 0,
  retiros_hoy_count INTEGER DEFAULT 0,
  
  -- Estadísticas MLM
  total_referidos INTEGER DEFAULT 0,
  comisiones_pendientes NUMERIC(20, 2) DEFAULT 0,
  
  -- Timestamps
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 3. INSERTAR FILA INICIAL
-- ============================================================================

INSERT INTO admin_dashboard (id) VALUES (1);

-- ============================================================================
-- 4. FUNCIÓN PARA ACTUALIZACIÓN MANUAL (BASE)
-- ============================================================================

CREATE FUNCTION refresh_admin_dashboard_manual()
RETURNS VOID AS $$
BEGIN
  UPDATE admin_dashboard SET
    -- Estadísticas de Usuarios (usando is_active)
    total_usuarios = (SELECT COUNT(*) FROM profiles),
    usuarios_activos = (SELECT COUNT(*) FROM profiles WHERE is_active = true),
    usuarios_inactivos = (SELECT COUNT(*) FROM profiles WHERE is_active = false),
    nuevos_usuarios_hoy = (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours'),
    nuevos_usuarios_semana = (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days'),
    
    -- Estadísticas Financieras (desde wallets)
    total_invertido = (SELECT COALESCE(SUM(balance_invertido), 0) FROM wallets),
    total_disponible = (SELECT COALESCE(SUM(balance_disponible), 0) FROM wallets),
    total_retirado = (SELECT COALESCE(SUM(total_retirado), 0) FROM wallets),
    total_comisiones = (SELECT COALESCE(SUM(total_comisiones), 0) FROM wallets),
    profit_distribuido = (SELECT COALESCE(SUM(amount), 0) FROM mlm_commissions WHERE type = 'profit'),
    
    -- Estadísticas de Depósitos
    total_depositos = (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'completed'),
    depositos_pendientes = (SELECT COUNT(*) FROM deposits WHERE status = 'pending'),
    depositos_pendientes_monto = (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'pending'),
    depositos_hoy = (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'),
    depositos_hoy_count = (SELECT COUNT(*) FROM deposits WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'),
    
    -- Estadísticas de Retiros
    total_retiros = (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed'),
    retiros_pendientes = (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'),
    retiros_pendientes_monto = (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'pending'),
    retiros_hoy = (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'),
    retiros_hoy_count = (SELECT COUNT(*) FROM withdrawals WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'),
    
    -- Estadísticas MLM
    total_referidos = (SELECT COUNT(*) FROM profiles WHERE sponsor_id IS NOT NULL),
    comisiones_pendientes = (SELECT COALESCE(SUM(amount), 0) FROM mlm_commissions WHERE is_paid = false),
    
    -- Timestamp
    last_updated = NOW()
  WHERE id = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCIÓN TRIGGER PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================================

CREATE FUNCTION update_admin_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_admin_dashboard_manual();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================================

CREATE TRIGGER trg_admin_dashboard_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  EXECUTE FUNCTION update_admin_dashboard();

CREATE TRIGGER trg_admin_dashboard_wallets
  AFTER INSERT OR UPDATE OR DELETE ON wallets
  EXECUTE FUNCTION update_admin_dashboard();

CREATE TRIGGER trg_admin_dashboard_deposits
  AFTER INSERT OR UPDATE OR DELETE ON deposits
  EXECUTE FUNCTION update_admin_dashboard();

CREATE TRIGGER trg_admin_dashboard_withdrawals
  AFTER INSERT OR UPDATE OR DELETE ON withdrawals
  EXECUTE FUNCTION update_admin_dashboard();

CREATE TRIGGER trg_admin_dashboard_commissions
  AFTER INSERT OR UPDATE OR DELETE ON mlm_commissions
  EXECUTE FUNCTION update_admin_dashboard();

CREATE TRIGGER trg_admin_dashboard_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  EXECUTE FUNCTION update_admin_dashboard();

-- ============================================================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE admin_dashboard ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Solo admins pueden ver
CREATE POLICY "Solo admins pueden ver admin_dashboard"
  ON admin_dashboard
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política para UPDATE: Solo admins pueden actualizar
CREATE POLICY "Solo admins pueden actualizar admin_dashboard"
  ON admin_dashboard
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Política para INSERT: Solo el sistema puede insertar (inicial)
CREATE POLICY "Solo sistema puede insertar admin_dashboard"
  ON admin_dashboard
  FOR INSERT
  WITH CHECK (id = 1);

-- ============================================================================
-- 8. FUNCIÓN RPC PARA OBTENER ESTADÍSTICAS
-- ============================================================================

CREATE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_usuarios INTEGER,
  usuarios_activos INTEGER,
  usuarios_inactivos INTEGER,
  nuevos_usuarios_hoy INTEGER,
  nuevos_usuarios_semana INTEGER,
  total_invertido NUMERIC,
  total_disponible NUMERIC,
  total_retirado NUMERIC,
  total_comisiones NUMERIC,
  profit_distribuido NUMERIC,
  total_depositos NUMERIC,
  deposits_pendientes INTEGER,
  deposits_pendientes_monto NUMERIC,
  depositos_hoy NUMERIC,
  depositos_hoy_count INTEGER,
  total_retiros NUMERIC,
  retiros_pendientes INTEGER,
  retiros_pendientes_monto NUMERIC,
  retiros_hoy NUMERIC,
  retiros_hoy_count INTEGER,
  total_referidos INTEGER,
  comisiones_pendientes NUMERIC
) SECURITY DEFINER AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT (SELECT is_user_admin()) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden ver estas estadísticas';
  END IF;
  
  -- Devolver datos de la tabla admin_dashboard
  RETURN QUERY
  SELECT
    ad.total_usuarios,
    ad.usuarios_activos,
    ad.usuarios_inactivos,
    ad.nuevos_usuarios_hoy,
    ad.nuevos_usuarios_semana,
    ad.total_invertido,
    ad.total_disponible,
    ad.total_retirado,
    ad.total_comisiones,
    ad.profit_distribuido,
    ad.total_depositos,
    ad.depositos_pendientes,
    ad.depositos_pendientes_monto,
    ad.depositos_hoy,
    ad.depositos_hoy_count,
    ad.total_retiros,
    ad.retiros_pendientes,
    ad.retiros_pendientes_monto,
    ad.retiros_hoy,
    ad.retiros_hoy_count,
    ad.total_referidos,
    ad.comisiones_pendientes
  FROM admin_dashboard ad
  WHERE ad.id = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. FUNCIÓN PARA ACTUALIZACIÓN MANUAL (SOLO ADMIN)
-- ============================================================================

CREATE FUNCTION refresh_admin_dashboard()
RETURNS VOID SECURITY DEFINER AS $$
BEGIN
  -- Verificar que el usuario sea admin
  IF NOT (SELECT is_user_admin()) THEN
    RAISE EXCEPTION 'Acceso denegado: Solo administradores pueden refrescar el dashboard';
  END IF;
  
  -- Ejecutar actualización manual
  PERFORM refresh_admin_dashboard_manual();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. ACTUALIZACIÓN INICIAL
-- ============================================================================

SELECT refresh_admin_dashboard_manual();

-- ============================================================================
-- 11. ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
CREATE INDEX IF NOT EXISTS idx_mlm_commissions_is_paid ON mlm_commissions(is_paid);

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
