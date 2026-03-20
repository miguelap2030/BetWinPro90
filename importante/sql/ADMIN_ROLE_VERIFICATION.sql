-- ============================================
-- ADMIN ROLE - VERIFICACIÓN Y CONFIGURACIÓN
-- ============================================
-- Este script verifica y configura todas las funciones
-- necesarias para el sistema de administración
-- ============================================

-- ============================================
-- 1. VERIFICAR Y AGREGAR CAMPO ROLE A PROFILES
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================
-- 2. FUNCIÓN is_user_admin() - Verificar si el usuario es admin
-- ============================================

CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean AS $$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_user_id;

  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNCIÓN get_admin_dashboard_stats() - Estadísticas del dashboard
-- ============================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_usuarios bigint,
  usuarios_activos bigint,
  usuarios_inactivos bigint,
  total_invertido numeric,
  total_disponible numeric,
  total_retirado numeric,
  total_comisiones numeric,
  total_depositos numeric,
  total_retiros numeric,
  retiros_pendientes bigint,
  deposits_pendientes bigint,
  profit_distribuido numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_usuarios,
    (SELECT COUNT(*) FROM profiles WHERE is_active = true) as usuarios_activos,
    (SELECT COUNT(*) FROM profiles WHERE is_active = false) as usuarios_inactivos,
    (SELECT COALESCE(SUM(balance_invertido), 0) FROM wallets) as total_invertido,
    (SELECT COALESCE(SUM(balance_disponible), 0) FROM wallets) as total_disponible,
    (SELECT COALESCE(SUM(total_retirado), 0) FROM wallets) as total_retirado,
    (SELECT COALESCE(SUM(total_comisiones), 0) FROM wallets) as total_comisiones,
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'completed') as total_depositos,
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'completed') as total_retiros,
    (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as retiros_pendientes,
    (SELECT COUNT(*) FROM deposits WHERE status = 'pending') as deposits_pendientes,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'profit') as profit_distribuido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN get_all_users_paginated() - Obtener usuarios con paginación
-- ============================================

CREATE OR REPLACE FUNCTION get_all_users_paginated(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT '',
  p_filter_active boolean DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  role text,
  is_active boolean,
  balance_invertido numeric,
  balance_disponible numeric,
  total_retirado numeric,
  created_at timestamp with time zone,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as user_id,
    p.username,
    p.email,
    p.role,
    p.is_active,
    COALESCE(w.balance_invertido, 0) as balance_invertido,
    COALESCE(w.balance_disponible, 0) as balance_disponible,
    COALESCE(w.total_retirado, 0) as total_retirado,
    p.created_at,
    COUNT(*) OVER() as total_count
  FROM profiles p
  LEFT JOIN wallets w ON p.id = w.user_id
  WHERE (p_search = '' OR p.username ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
    AND (p_filter_active IS NULL OR p.is_active = p_filter_active)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN get_withdrawals_pending() - Obtener retiros pendientes
-- ============================================

CREATE OR REPLACE FUNCTION get_withdrawals_pending()
RETURNS TABLE (
  withdrawal_id uuid,
  user_id uuid,
  username text,
  email text,
  amount numeric,
  payment_method text,
  payment_address text,
  status text,
  created_at timestamp with time zone,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id as withdrawal_id,
    w.user_id,
    p.username,
    p.email,
    w.amount,
    w.payment_method,
    w.payment_address,
    w.status,
    w.created_at,
    w.notes
  FROM withdrawals w
  JOIN profiles p ON w.user_id = p.id
  WHERE w.status = 'pending'
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN get_deposits_pending() - Obtener depósitos pendientes
-- ============================================

CREATE OR REPLACE FUNCTION get_deposits_pending()
RETURNS TABLE (
  deposit_id uuid,
  user_id uuid,
  username text,
  email text,
  amount numeric,
  payment_method text,
  transaction_hash text,
  status text,
  created_at timestamp with time zone,
  notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as deposit_id,
    d.user_id,
    p.username,
    p.email,
    d.amount,
    d.payment_method,
    d.transaction_hash,
    d.status,
    d.created_at,
    d.notes
  FROM deposits d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.status = 'pending'
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNCIÓN admin_process_withdrawal() - Aprobar/Rechazar retiro
-- ============================================

CREATE OR REPLACE FUNCTION admin_process_withdrawal(
  p_withdrawal_id uuid,
  p_status text,
  p_admin_notes text DEFAULT ''
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_current_balance numeric;
BEGIN
  SELECT w.user_id, w.amount
  INTO v_user_id, v_amount
  FROM withdrawals w
  WHERE w.id = p_withdrawal_id AND w.status = 'pending';

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Retiro no encontrado o ya procesado';
    RETURN;
  END IF;

  SELECT balance_disponible INTO v_current_balance
  FROM wallets
  WHERE user_id = v_user_id;

  IF p_status = 'approved' THEN
    IF v_current_balance < v_amount THEN
      RETURN QUERY SELECT false, 'Saldo insuficiente del usuario';
      RETURN;
    END IF;

    UPDATE withdrawals
    SET
      status = 'approved',
      notes = COALESCE(notes || ' | ', '') || 'Aprobado por admin: ' || p_admin_notes,
      updated_at = NOW()
    WHERE id = p_withdrawal_id;

    UPDATE wallets
    SET
      balance_disponible = balance_disponible - v_amount,
      total_retirado = total_retirado + v_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;

    INSERT INTO transactions (
      id, user_id, type, amount, description, reference, created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'withdrawal',
      v_amount,
      CONCAT('Retiro aprobado: $', v_amount),
      'admin_approved',
      NOW()
    );

    RETURN QUERY SELECT true, 'Retiro aprobado exitosamente';

  ELSIF p_status = 'rejected' THEN
    UPDATE withdrawals
    SET
      status = 'rejected',
      notes = COALESCE(notes || ' | ', '') || 'Rechazado por admin: ' || p_admin_notes,
      updated_at = NOW()
    WHERE id = p_withdrawal_id;

    INSERT INTO transactions (
      id, user_id, type, amount, description, reference, created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'withdrawal_rejected',
      v_amount,
      CONCAT('Retiro rechazado: $', v_amount),
      'admin_rejected',
      NOW()
    );

    RETURN QUERY SELECT true, 'Retiro rechazado';

  ELSE
    RETURN QUERY SELECT false, 'Estado inválido. Use "approved" o "rejected"';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCIÓN admin_process_deposit() - Aprobar/Rechazar depósito
-- ============================================

CREATE OR REPLACE FUNCTION admin_process_deposit(
  p_deposit_id uuid,
  p_status text,
  p_admin_notes text DEFAULT ''
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
BEGIN
  SELECT d.user_id, d.amount
  INTO v_user_id, v_amount
  FROM deposits d
  WHERE d.id = p_deposit_id AND d.status = 'pending';

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Depósito no encontrado o ya procesado';
    RETURN;
  END IF;

  IF p_status = 'approved' THEN
    UPDATE deposits
    SET
      status = 'completed',
      notes = COALESCE(notes || ' | ', '') || 'Aprobado por admin: ' || p_admin_notes,
      updated_at = NOW()
    WHERE id = p_deposit_id;

    UPDATE wallets
    SET
      balance_invertido = balance_invertido + v_amount,
      updated_at = NOW()
    WHERE user_id = v_user_id;

    INSERT INTO transactions (
      id, user_id, type, amount, description, reference, created_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'deposit',
      v_amount,
      CONCAT('Depósito aprobado: $', v_amount),
      'admin_approved',
      NOW()
    );

    PERFORM distribute_deposit_commissions(p_deposit_id);

    RETURN QUERY SELECT true, 'Depósito aprobado exitosamente';

  ELSIF p_status = 'rejected' THEN
    UPDATE deposits
    SET
      status = 'rejected',
      notes = COALESCE(notes || ' | ', '') || 'Rechazado por admin: ' || p_admin_notes,
      updated_at = NOW()
    WHERE id = p_deposit_id;

    RETURN QUERY SELECT true, 'Depósito rechazado';

  ELSE
    RETURN QUERY SELECT false, 'Estado inválido. Use "approved" o "rejected"';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. FUNCIÓN admin_update_user_role() - Actualizar rol de usuario
-- ============================================

CREATE OR REPLACE FUNCTION admin_update_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
BEGIN
  IF p_role NOT IN ('user', 'admin', 'moderator') THEN
    RETURN QUERY SELECT false, 'Rol inválido. Use "user", "admin" o "moderator"';
    RETURN;
  END IF;

  UPDATE profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'Rol actualizado exitosamente';
  ELSE
    RETURN QUERY SELECT false, 'Usuario no encontrado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. FUNCIÓN admin_toggle_user_active() - Activar/Desactivar usuario
-- ============================================

CREATE OR REPLACE FUNCTION admin_toggle_user_active(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
BEGIN
  UPDATE profiles
  SET is_active = p_is_active, updated_at = NOW()
  WHERE id = p_user_id;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'Estado actualizado exitosamente';
  ELSE
    RETURN QUERY SELECT false, 'Usuario no encontrado';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver todos los perfiles" ON profiles;
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins pueden actualizar roles" ON profiles;
CREATE POLICY "Admins pueden actualizar roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================
-- 12. CONCEDER PERMISOS DE EJECUCIÓN
-- ============================================

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_paginated(integer, integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_withdrawals_pending() TO authenticated;
GRANT EXECUTE ON FUNCTION get_deposits_pending() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_deposit(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin() TO authenticated;

-- ============================================
-- 13. CONSULTAS DE VERIFICACIÓN
-- ============================================

-- Verificar que las funciones existen:
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'is_user_admin',
    'get_admin_dashboard_stats',
    'get_all_users_paginated',
    'get_withdrawals_pending',
    'get_deposits_pending',
    'admin_process_withdrawal',
    'admin_process_deposit',
    'admin_update_user_role',
    'admin_toggle_user_active'
  )
ORDER BY routine_name;

-- Verificar usuarios con rol admin:
SELECT 
  p.id,
  p.username,
  p.email,
  p.role,
  p.is_active,
  p.created_at
FROM profiles p
WHERE p.role = 'admin'
ORDER BY p.created_at;

-- ============================================
-- COMANDOS ÚTILES PARA EL ADMIN
-- ============================================

-- Establecer un usuario como admin (cambiar el email):
-- UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@admin.com';

-- Verificar si el usuario actual es admin (ejecutar después de loguearse):
-- SELECT is_user_admin();

-- Ver estadísticas del dashboard:
-- SELECT * FROM get_admin_dashboard_stats();

-- Ver todos los usuarios:
-- SELECT * FROM get_all_users_paginated(20, 0, '', NULL);

-- Ver retiros pendientes:
-- SELECT * FROM get_withdrawals_pending();

-- Ver depósitos pendientes:
-- SELECT * FROM get_deposits_pending();
