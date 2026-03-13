-- ============================================================================
-- AGREGAR POLÍTICAS RLS PARA INSERT/UPDATE - PERFILES Y WALLETS
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- ============================================================================
-- 1. POLÍTICAS PARA PROFILES
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "profiles_insert_public" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_update_public" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- INSERT: Cualquier usuario autenticado puede crear su propio perfil
-- Usamos auth.uid() = id para asegurar que solo puedan crear su propio perfil
CREATE POLICY "profiles_insert_user"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- UPDATE: Solo el dueño puede actualizar su perfil
CREATE POLICY "profiles_update_user"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- DELETE: Solo el dueño puede eliminar su perfil (opcional)
CREATE POLICY "profiles_delete_user"
    ON profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================================================
-- 2. POLÍTICAS PARA WALLETS
-- ============================================================================

DROP POLICY IF EXISTS "wallets_insert_public" ON wallets;
DROP POLICY IF EXISTS "wallets_insert_authenticated" ON wallets;
DROP POLICY IF EXISTS "wallets_update_own" ON wallets;

-- INSERT: Usuario autenticado puede crear su wallet
CREATE POLICY "wallets_insert_user"
    ON wallets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Solo el dueño puede actualizar su wallet
CREATE POLICY "wallets_update_user"
    ON wallets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3. VERIFICAR POLÍTICAS CREADAS
-- ============================================================================

SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('profiles', 'wallets')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 4. CREAR PERFILES PARA USUARIOS AUTH SIN PERFIL
-- ============================================================================

-- Buscar usuarios en auth.users sin perfil en profiles
INSERT INTO profiles (id, username, email, sponsor_id, referral_code, is_active)
SELECT 
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'username',
        SPLIT_PART(au.email, '@', 1)
    ),
    au.email,
    CASE 
        WHEN au.raw_user_meta_data->>'sponsor_id' IS NOT NULL 
             AND au.raw_user_meta_data->>'sponsor_id' != '' 
        THEN (au.raw_user_meta_data->>'sponsor_id')::UUID
        ELSE NULL
    END,
    UPPER(SUBSTRING(MD5(au.id::TEXT || RANDOM()::TEXT), 1, 8)),
    TRUE
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Crear wallets faltantes
INSERT INTO wallets (user_id, balance_disponible, balance_invertido)
SELECT au.id, 0, 0
FROM auth.users au
LEFT JOIN wallets w ON au.id = w.user_id
WHERE w.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 5. VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    'ESTADO' AS estado,
    (SELECT COUNT(*) FROM profiles) AS profiles,
    (SELECT COUNT(*) FROM wallets) AS wallets,
    (SELECT COUNT(*) FROM auth.users) AS auth_users;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
