-- ============================================================================
-- SISTEMA MLM UNILEVEL - 3 NIVELES CON CTE RECURSIVOS
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================
-- ENFOQUE: Usar CTE recursivo para calcular niveles en tiempo real
-- NO depende de tabla referrals ni triggers complejos
-- ============================================================================

-- ============================================================================
-- 1. ELIMINAR TABLA REFERRALS (YA NO LA NECESITAMOS)
-- ============================================================================
DROP TABLE IF EXISTS referrals CASCADE;

-- ============================================================================
-- 2. POLÍTICAS RLS - LECTURA 100% PÚBLICA
-- ============================================================================

-- Profiles: lectura pública, escritura authenticated
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_public" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_public"
    ON profiles FOR SELECT
    TO anon, authenticated, service_role
    USING (TRUE);

CREATE POLICY "profiles_insert_public"
    ON profiles FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Wallets: lectura pública, escritura authenticated
DROP POLICY IF EXISTS "wallets_select_public" ON wallets;
DROP POLICY IF EXISTS "wallets_insert_public" ON wallets;
DROP POLICY IF EXISTS "wallets_update_own" ON wallets;

CREATE POLICY "wallets_select_public"
    ON wallets FOR SELECT
    TO anon, authenticated, service_role
    USING (TRUE);

CREATE POLICY "wallets_insert_public"
    ON wallets FOR INSERT
    TO anon, authenticated
    WITH CHECK (TRUE);

CREATE POLICY "wallets_update_own"
    ON wallets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3. FUNCIONES RPC CON CTE RECURSIVO PARA MLM UNILEVEL
-- ============================================================================

-- Función para obtener TODA la red de referidos (hasta nivel 3)
-- Usa CTE recursivo para calcular niveles dinámicamente
DROP FUNCTION IF EXISTS get_referrals_tree_recursive(UUID);
CREATE OR REPLACE FUNCTION get_referrals_tree_recursive(p_user_id UUID)
RETURNS TABLE (
    referral_id UUID,
    username TEXT,
    email TEXT,
    referral_code TEXT,
    level INT,
    joined_date TIMESTAMPTZ,
    balance_disponible NUMERIC,
    balance_invertido NUMERIC,
    sponsor_id UUID,
    sponsor_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        -- CASO BASE: Referidos directos (nivel 1)
        SELECT
            p.id AS referred_id,
            p.username,
            p.email,
            p.referral_code,
            1 AS level,
            p.created_at AS joined_date,
            COALESCE(w.balance_disponible, 0) AS balance_disponible,
            COALESCE(w.balance_invertido, 0) AS balance_invertido,
            p.sponsor_id,
            (SELECT sp.username FROM profiles sp WHERE sp.id = p.sponsor_id) AS sponsor_username
        FROM profiles p
        LEFT JOIN wallets w ON p.id = w.user_id
        WHERE p.sponsor_id = p_user_id
          AND p.is_active = TRUE

        UNION ALL

        -- PARTE RECURSIVA: Niveles 2 y 3
        SELECT
            p.id AS referred_id,
            p.username,
            p.email,
            p.referral_code,
            rc.level + 1 AS level,
            p.created_at AS joined_date,
            COALESCE(w.balance_disponible, 0) AS balance_disponible,
            COALESCE(w.balance_invertido, 0) AS balance_invertido,
            p.sponsor_id,
            (SELECT sp.username FROM profiles sp WHERE sp.id = p.sponsor_id) AS sponsor_username
        FROM profiles p
        INNER JOIN referral_chain rc ON p.sponsor_id = rc.referred_id
        LEFT JOIN wallets w ON p.id = w.user_id
        WHERE rc.level < 3
          AND p.is_active = TRUE
    )
    SELECT
        rc.referred_id AS referral_id,
        rc.username,
        rc.email,
        rc.referral_code,
        rc.level::INT,
        rc.joined_date,
        rc.balance_disponible,
        rc.balance_invertido,
        rc.sponsor_id,
        rc.sponsor_username
    FROM referral_chain rc
    ORDER BY rc.level, rc.joined_date DESC;
END;
$$;

-- Función para obtener referidos por nivel específico
DROP FUNCTION IF EXISTS get_referrals_by_level_recursive(UUID, INT);
CREATE OR REPLACE FUNCTION get_referrals_by_level_recursive(
    p_user_id UUID,
    p_level INT DEFAULT 1
)
RETURNS TABLE (
    referral_id UUID,
    username TEXT,
    email TEXT,
    referral_code TEXT,
    level INT,
    joined_date TIMESTAMPTZ,
    balance_disponible NUMERIC,
    balance_invertido NUMERIC,
    sponsor_id UUID,
    sponsor_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        -- CASO BASE: Nivel 1
        SELECT
            p.id AS referred_id,
            p.username,
            p.email,
            p.referral_code,
            1 AS level,
            p.created_at AS joined_date,
            COALESCE(w.balance_disponible, 0) AS balance_disponible,
            COALESCE(w.balance_invertido, 0) AS balance_invertido,
            p.sponsor_id,
            (SELECT sp.username FROM profiles sp WHERE sp.id = p.sponsor_id) AS sponsor_username
        FROM profiles p
        LEFT JOIN wallets w ON p.id = w.user_id
        WHERE p.sponsor_id = p_user_id
          AND p.is_active = TRUE

        UNION ALL

        -- PARTE RECURSIVA: Niveles siguientes
        SELECT
            p.id AS referred_id,
            p.username,
            p.email,
            p.referral_code,
            rc.level + 1 AS level,
            p.created_at AS joined_date,
            COALESCE(w.balance_disponible, 0) AS balance_disponible,
            COALESCE(w.balance_invertido, 0) AS balance_invertido,
            p.sponsor_id,
            (SELECT sp.username FROM profiles sp WHERE sp.id = p.sponsor_id) AS sponsor_username
        FROM profiles p
        INNER JOIN referral_chain rc ON p.sponsor_id = rc.referred_id
        LEFT JOIN wallets w ON p.id = w.user_id
        WHERE rc.level < 3
          AND p.is_active = TRUE
    )
    SELECT
        rc.referred_id AS referral_id,
        rc.username,
        rc.email,
        rc.referral_code,
        rc.level::INT,
        rc.joined_date,
        rc.balance_disponible,
        rc.balance_invertido,
        rc.sponsor_id,
        rc.sponsor_username
    FROM referral_chain rc
    WHERE rc.level = p_level
    ORDER BY rc.joined_date DESC;
END;
$$;

-- Función para contar referidos por nivel
DROP FUNCTION IF EXISTS get_referral_counts_recursive(UUID);
CREATE OR REPLACE FUNCTION get_referral_counts_recursive(p_user_id UUID)
RETURNS TABLE (
    total_referrals BIGINT,
    level_1_count BIGINT,
    level_2_count BIGINT,
    level_3_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_chain AS (
        SELECT
            p.id AS referred_id,
            1 AS level
        FROM profiles p
        WHERE p.sponsor_id = p_user_id
          AND p.is_active = TRUE

        UNION ALL

        SELECT
            p.id AS referred_id,
            rc.level + 1 AS level
        FROM profiles p
        INNER JOIN referral_chain rc ON p.sponsor_id = rc.referred_id
        WHERE rc.level < 3
          AND p.is_active = TRUE
    )
    SELECT
        COUNT(*) FILTER (WHERE TRUE) AS total_referrals,
        COUNT(*) FILTER (WHERE level = 1) AS level_1_count,
        COUNT(*) FILTER (WHERE level = 2) AS level_2_count,
        COUNT(*) FILTER (WHERE level = 3) AS level_3_count
    FROM referral_chain;
END;
$$;

-- Función para obtener el upline (ascendencia) de un usuario
DROP FUNCTION IF EXISTS get_user_upline_recursive(UUID);
CREATE OR REPLACE FUNCTION get_user_upline_recursive(p_user_id UUID)
RETURNS TABLE (
    sponsor_id UUID,
    username TEXT,
    email TEXT,
    referral_code TEXT,
    level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE upline_chain AS (
        -- CASO BASE: Sponsor directo
        SELECT
            p.sponsor_id,
            sp.username,
            sp.email,
            sp.referral_code,
            1 AS level
        FROM profiles p
        JOIN profiles sp ON p.sponsor_id = sp.id
        WHERE p.id = p_user_id
          AND p.sponsor_id IS NOT NULL

        UNION ALL

        -- PARTE RECURSIVA: Sponsors ascendentes
        SELECT
            p.sponsor_id,
            sp.username,
            sp.email,
            sp.referral_code,
            uc.level + 1 AS level
        FROM profiles p
        INNER JOIN upline_chain uc ON p.id = uc.sponsor_id
        JOIN profiles sp ON p.sponsor_id = sp.id
        WHERE uc.level < 10
          AND p.sponsor_id IS NOT NULL
    )
    SELECT
        uc.sponsor_id,
        uc.username,
        uc.email,
        uc.referral_code,
        uc.level::INT
    FROM upline_chain uc
    ORDER BY uc.level ASC;
END;
$$;

-- ============================================================================
-- 4. PERMISOS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_referrals_tree_recursive TO authenticated;
GRANT EXECUTE ON FUNCTION get_referrals_by_level_recursive TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_counts_recursive TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_upline_recursive TO authenticated;

-- ============================================================================
-- 5. ÍNDICES DE RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_sponsor ON profiles(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_sponsor_active ON profiles(sponsor_id, is_active);

-- ============================================================================
-- 6. REPARAR DATOS EXISTENTES - ASEGURAR QUE SPONSOR_ID ESTÉ CORRECTO
-- ============================================================================

-- Actualizar sponsor_id para usuarios que se registraron con referido
-- (Esto asume que el frontend ya guardó sponsor_id correctamente)

-- Verificar perfiles con sponsor
SELECT 
    'PERFILES CON SPONSOR' AS estado,
    COUNT(*) AS cantidad,
    COUNT(DISTINCT sponsor_id) AS sponsors_diferentes
FROM profiles
WHERE sponsor_id IS NOT NULL;

-- ============================================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    'ESTADO DEL SISTEMA' AS estado,
    (SELECT COUNT(*) FROM profiles) AS total_perfiles,
    (SELECT COUNT(*) FROM profiles WHERE sponsor_id IS NOT NULL) AS con_sponsor,
    (SELECT COUNT(*) FROM wallets) AS total_wallets;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. El sistema MLM ahora usa CTE recursivo (NO necesita tabla referrals)
-- 3. Los niveles se calculan en tiempo real desde profiles.sponsor_id
-- 4. El frontend (SignUp.jsx) debe guardar sponsor_id al crear perfil
--
-- PRUEBAS:
-- SELECT * FROM get_referrals_tree_recursive('USER_ID_AQUI');
-- SELECT * FROM get_referrals_by_level_recursive('USER_ID_AQUI', 1);
-- SELECT * FROM get_referrals_by_level_recursive('USER_ID_AQUI', 2);
-- SELECT * FROM get_referrals_by_level_recursive('USER_ID_AQUI', 3);
-- SELECT * FROM get_referral_counts_recursive('USER_ID_AQUI');
-- ============================================================================
