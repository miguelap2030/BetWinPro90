-- ============================================================================
-- POLÍTICAS RLS PARA TRANSFERS_INTERNAS
-- ============================================================================
-- EJECUTAR EN: https://alyboipgbixoufqftizd.supabase.co/project/sql
-- ============================================================================

-- Habilitar RLS
ALTER TABLE transfers_internas ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "transfers_insert_user" ON transfers_internas;
DROP POLICY IF EXISTS "transfers_select_user" ON transfers_internas;
DROP POLICY IF EXISTS "transfers_update_user" ON transfers_internas;

-- POLÍTICA: Usuario autenticado puede INSERTAR sus propias transferencias
CREATE POLICY "transfers_insert_user"
    ON transfers_internas FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- POLÍTICA: Usuario puede ver SUS transferencias
CREATE POLICY "transfers_select_user"
    ON transfers_internas FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- POLÍTICA: Usuario puede actualizar SUS transferencias
CREATE POLICY "transfers_update_user"
    ON transfers_internas FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'transfers_internas'
ORDER BY policyname;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
