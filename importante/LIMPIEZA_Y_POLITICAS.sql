-- ============================================================================
-- LIMPIEZA - ELIMINAR TRIGGERS Y FUNCIONES QUE USAN REFERRALS
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- ============================================================================
-- 1. ELIMINAR TRIGGERS QUE USAN REFERRALS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_maintain_referral_tree ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- 2. ELIMINAR FUNCIONES QUE USAN REFERRALS
-- ============================================================================

DROP FUNCTION IF EXISTS public.maintain_referral_tree();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- 3. AGREGAR POLÍTICAS RLS PARA INSERT/UPDATE
-- ============================================================================

-- Profiles: INSERT para authenticated (pueden crear SU PROPIO perfil)
DROP POLICY IF EXISTS "profiles_insert_user" ON profiles;
CREATE POLICY "profiles_insert_user"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Profiles: UPDATE solo para el dueño
DROP POLICY IF EXISTS "profiles_update_user" ON profiles;
CREATE POLICY "profiles_update_user"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Profiles: DELETE solo para el dueño
DROP POLICY IF EXISTS "profiles_delete_user" ON profiles;
CREATE POLICY "profiles_delete_user"
    ON profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- Wallets: INSERT para authenticated
DROP POLICY IF EXISTS "wallets_insert_user" ON wallets;
CREATE POLICY "wallets_insert_user"
    ON wallets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Wallets: UPDATE solo para el dueño
DROP POLICY IF EXISTS "wallets_update_user" ON wallets;
CREATE POLICY "wallets_update_user"
    ON wallets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CREAR PERFILES PARA USUARIOS AUTH SIN PERFIL
-- ============================================================================

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
-- 5. VERIFICACIÓN
-- ============================================================================

SELECT 
    'ESTADO' AS estado,
    (SELECT COUNT(*) FROM profiles) AS profiles,
    (SELECT COUNT(*) FROM wallets) AS wallets,
    (SELECT COUNT(*) FROM auth.users) AS auth_users;

-- Ver políticas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('profiles', 'wallets')
ORDER BY tablename, policyname;

-- ============================================================================
-- FIN DEL SCRIPT - AHORA EL SISTEMA USA CTE RECURSIVO SIN TRIGGERS
-- ============================================================================
