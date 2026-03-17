-- ============================================
-- FUNCIÓN RPC PARA VALIDAR CÓDIGO DE REFERIDO
-- ============================================
-- Esta función permite validar un código de referido
-- sin estar bloqueado por las políticas RLS de la tabla profiles.
--
-- Uso:
--   SELECT * FROM validate_referral_code('A1B2C3D4');
--
-- Retorna:
--   - id, username, referral_code del sponsor si existe
--   - NULL si el código no existe
-- ============================================

CREATE OR REPLACE FUNCTION validate_referral_code(p_referral_code TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  referral_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador (bypass RLS)
AS $$
BEGIN
  -- Normalizar el código de referido (mayúsculas y sin espacios)
  p_referral_code := UPPER(TRIM(p_referral_code));
  
  -- Retornar null si el código está vacío
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN;
  END IF;
  
  -- Buscar el perfil con el código de referido (sin filtrar por is_active)
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.referral_code
  FROM profiles p
  WHERE p.referral_code = p_referral_code;
  
  -- Si no encuentra nada, retorna NULL automáticamente
END;
$$;

-- ============================================
-- POLÍTICAS DE SEGURIDAD
-- ============================================
-- Permitir que usuarios autenticados y anon ejecuten esta función
-- SECURITY DEFINER ya permite bypass de RLS

GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code TO anon;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON FUNCTION validate_referral_code IS 
  'Valida un código de referido y retorna la información del sponsor si existe. 
   Usa SECURITY DEFINER para bypass de RLS.';

-- ============================================
-- EJEMPLO DE USO
-- ============================================
-- SELECT * FROM validate_referral_code('A1B2C3D4');
-- 
-- Resultado esperado:
--   id | username | referral_code
--   ----+----------+---------------
--   uuid | juan123 | A1B2C3D4
--
-- Si no existe el código, retorna 0 filas (NULL)
