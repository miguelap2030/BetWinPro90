-- ============================================
-- DIAGNÓSTICO Y SOLUCIÓN - CÓDIGO DE REFERIDO
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para verificar el estado de la tabla profiles
-- y las políticas RLS
-- ============================================

-- 1. VERIFICAR ESTRUCTURA DE LA TABLA PROFILES
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. VERIFICAR SI EXISTEN CÓDIGOS DE REFERIDO
-- ============================================
SELECT id, username, email, referral_code, sponsor_id, is_active, role
FROM profiles
WHERE referral_code IS NOT NULL
LIMIT 10;

-- 3. CONTAR CÓDIGOS DE REFERIDO REGISTRADOS
-- ============================================
SELECT COUNT(*) as total_codigos
FROM profiles
WHERE referral_code IS NOT NULL;

-- 4. VERIFICAR POLÍTICAS RLS EN PROFILES
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. VERIFICAR SI RLS ESTÁ ACTIVADO
-- ============================================
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- 6. PROBAR CONSULTA DIRECTA (como usuario anon)
-- ============================================
-- Esta es la consulta que falla si RLS está muy restrictivo
SELECT id, username, referral_code
FROM profiles
WHERE referral_code = 'TEST123'  -- Cambia por un código real si existe
LIMIT 1;

-- 7. CREAR/REEMPLAZAR FUNCIÓN RPC PARA VALIDAR REFERIDO
-- ============================================
-- Esta función usa SECURITY DEFINER para bypass de RLS

CREATE OR REPLACE FUNCTION validate_referral_code(p_referral_code TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  referral_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Normalizar el código de referido (mayúsculas y sin espacios)
  p_referral_code := UPPER(TRIM(p_referral_code));
  
  -- Retornar null si el código está vacío
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN;
  END IF;
  
  -- Buscar el perfil con el código de referido
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.referral_code
  FROM profiles p
  WHERE p.referral_code = p_referral_code
    AND (p.is_active = TRUE OR p.is_active IS NULL); -- Permitir si es NULL
  
  -- Si no encuentra nada, retorna NULL automáticamente
END;
$$;

-- 8. GRANT PARA USUARIOS AUTENTICADOS
-- ============================================
GRANT EXECUTE ON FUNCTION validate_referral_code TO authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code TO anon;

-- 9. COMENTARIO PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON FUNCTION validate_referral_code IS 
  'Valida un código de referido y retorna la información del sponsor si existe. 
   Usa SECURITY DEFINER para bypass de RLS.';

-- 10. VERIFICAR QUE LA FUNCIÓN SE CREÓ
-- ============================================
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'validate_referral_code';

-- 11. PROBAR LA FUNCIÓN RPC
-- ============================================
-- Reemplaza 'TEST123' con un código de referido real de tu base de datos
SELECT * FROM validate_referral_code('TEST123');

-- 12. SI NO HAY CÓDIGOS DE REFERIDO, CREAR UNO DE PRUEBA
-- ============================================
-- Descomenta esto si necesitas un usuario de prueba
/*
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Crear usuario de prueba en auth.users si no existe
  SELECT id INTO test_user_id
  FROM auth.users
  WHERE email = 'test@betwinpro90.com';
  
  IF test_user_id IS NULL THEN
    -- Nota: Esto requiere permisos de admin
    RAISE NOTICE 'No se puede crear usuario de prueba automáticamente';
    RAISE NOTICE 'Por favor crea un usuario y verifica su referral_code';
  END IF;
END $$;
*/

-- ============================================
-- INSTRUCCIONES DESPUÉS DE EJECUTAR
-- ============================================
/*
1. Ejecuta TODO el script en el SQL Editor de Supabase
2. Revisa los resultados de cada consulta
3. Si la consulta #2 muestra códigos de referido, usa uno de ellos para probar la función en #11
4. Si la función en #11 retorna datos, el problema estaba en las políticas RLS
5. El hook useValidateReferralCode ahora usa esta función RPC

Si el problema persiste:
- Verifica que las políticas RLS permitan SELECT en profiles para usuarios autenticados
- O agrega una política como:

CREATE POLICY "Permitir ver códigos de referido"
ON profiles FOR SELECT
TO authenticated
USING (true);

*/
