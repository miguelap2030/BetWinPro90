-- ============================================================================
-- BETWINPRO90 - SISTEMA COMPLETO DE BASE DE DATOS
-- ============================================================================
-- Plataforma de Inversión en Criptomonedas con MLM y Apuestas Deportivas
-- ============================================================================
-- Estructura completa:
-- 1. Extensiones
-- 2. Tablas principales (profiles, wallets)
-- 3. Tablas de transacciones (deposits, withdrawals, transactions)
-- 4. Tablas MLM (mlm_commissions, referrals)
-- 5. Funciones RPC
-- 6. Triggers
-- 7. Políticas RLS (Row Level Security)
-- 8. Datos de prueba
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLAS PRINCIPALES
-- ============================================================================

-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    sponsor_id UUID REFERENCES profiles(id),
    referral_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,  -- TRUE si tiene saldo en balance_invertido
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets (separada para mejor organización)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance_disponible NUMERIC(18, 2) DEFAULT 0,
    balance_invertido NUMERIC(18, 2) DEFAULT 0,
    total_retirado NUMERIC(18, 2) DEFAULT 0,
    total_comisiones NUMERIC(18, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TABLAS DE TRANSACCIONES
-- ============================================================================

-- Depósitos
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending', -- pending, completed, cancelled
    payment_method TEXT,
    transaction_hash TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retiros
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    wallet_address TEXT,
    processed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- deposit, withdrawal, profit, commission, transfer_in, transfer_out, bet_win, bet_loss, bonus
    amount NUMERIC(18, 2) NOT NULL,
    description TEXT,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transferencias internas
CREATE TABLE IF NOT EXISTS transfers_internas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(18, 2) NOT NULL,
    type TEXT NOT NULL, -- to_invested, from_invested
    from_wallet TEXT NOT NULL, -- disponible, invertido
    to_wallet TEXT NOT NULL, -- invertido, disponible
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TABLAS MLM
-- ============================================================================

-- Comisiones MLM
CREATE TABLE IF NOT EXISTS mlm_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Quien recibe
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Quien generó
    level INT NOT NULL, -- 1, 2, 3
    type TEXT DEFAULT 'deposit', -- deposit, profit
    amount NUMERIC(18, 8) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    related_deposit_id UUID REFERENCES deposits(id),
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referidos directos
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sponsor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sponsor_id, referred_id)
);

-- ============================================================================
-- 5. ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_sponsor ON profiles(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_mlm_commissions_user ON mlm_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mlm_commissions_from_user ON mlm_commissions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_mlm_commissions_deposit ON mlm_commissions(related_deposit_id);
CREATE INDEX IF NOT EXISTS idx_referrals_sponsor ON referrals(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- ============================================================================
-- 6. FUNCIONES DE UTILIDAD
-- ============================================================================

-- Función para obtener sponsors ascendentes (upline)
CREATE OR REPLACE FUNCTION get_upline_sponsors(p_user_id UUID, p_max_level INT DEFAULT 3)
RETURNS TABLE (
    sponsor_id UUID,
    username TEXT,
    level INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_sponsor_id UUID;
    current_level INT := 1;
BEGIN
    SELECT p.sponsor_id INTO current_sponsor_id
    FROM profiles p
    WHERE p.id = p_user_id;

    WHILE current_sponsor_id IS NOT NULL AND current_level <= p_max_level LOOP
        RETURN QUERY
        SELECT
            sp.id AS sponsor_id,
            sp.username,
            current_level AS level
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        SELECT sp.sponsor_id INTO current_sponsor_id
        FROM profiles sp
        WHERE sp.id = current_sponsor_id;

        current_level := current_level + 1;
    END LOOP;
END;
$$;

-- Función para distribuir comisiones por depósito
CREATE OR REPLACE FUNCTION distribute_deposit_commissions(p_deposit_id UUID)
RETURNS TABLE (
    level INT,
    sponsor_username TEXT,
    commission_amount NUMERIC,
    success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deposit RECORD;
    v_upline RECORD;
    v_commission NUMERIC(18, 8);
    v_percentage NUMERIC(5, 2);
    v_existing_commission RECORD;
BEGIN
    -- Obtener información del depósito
    SELECT * INTO v_deposit
    FROM deposits d
    WHERE d.id = p_deposit_id
      AND d.status = 'completed';

    IF v_deposit IS NULL THEN
        RAISE NOTICE 'Depósito no encontrado o no está completado: %', p_deposit_id;
        RETURN;
    END IF;

    -- Obtener upline (sponsors ascendentes hasta nivel 3)
    FOR v_upline IN SELECT * FROM get_upline_sponsors(v_deposit.user_id, 3) LOOP
        -- Determinar porcentaje según nivel
        CASE v_upline.level
            WHEN 1 THEN v_percentage := 5.00;  -- 5% nivel 1
            WHEN 2 THEN v_percentage := 3.00;  -- 3% nivel 2
            WHEN 3 THEN v_percentage := 1.00;  -- 1% nivel 3
            ELSE v_percentage := 0.00;
        END CASE;

        -- Calcular comisión
        v_commission := v_deposit.amount * (v_percentage / 100);

        IF v_commission > 0 THEN
            -- VERIFICAR si ya existe esta comisión para evitar duplicados
            SELECT * INTO v_existing_commission
            FROM mlm_commissions mc
            WHERE mc.user_id = v_upline.sponsor_id
              AND mc.from_user_id = v_deposit.user_id
              AND mc.level = v_upline.level
              AND mc.related_deposit_id = p_deposit_id;

            IF v_existing_commission IS NULL THEN
                -- Insertar comisión en mlm_commissions
                INSERT INTO mlm_commissions (
                    user_id,
                    from_user_id,
                    level,
                    type,
                    amount,
                    percentage,
                    related_deposit_id,
                    is_paid
                ) VALUES (
                    v_upline.sponsor_id,
                    v_deposit.user_id,
                    v_upline.level,
                    'deposit',
                    v_commission,
                    v_percentage,
                    p_deposit_id,
                    TRUE
                );

                -- Insertar transacción en transactions
                INSERT INTO transactions (
                    user_id,
                    type,
                    amount,
                    description
                ) VALUES (
                    v_upline.sponsor_id,
                    'commission',
                    v_commission,
                    'Comisión MLM nivel ' || v_upline.level || ' - Referido: ' || COALESCE(v_deposit.user_id::text, 'N/A')
                );

                -- Actualizar wallet del sponsor
                UPDATE wallets w
                SET 
                    balance_disponible = w.balance_disponible + v_commission,
                    total_comisiones = w.total_comisiones + v_commission
                WHERE w.user_id = v_upline.sponsor_id;

                -- Retornar información
                RETURN QUERY
                SELECT
                    v_upline.level,
                    v_upline.username,
                    v_commission,
                    TRUE AS success;
            ELSE
                RAISE NOTICE 'Comisión ya existe para sponsor %, nivel %, deposit %', 
                    v_upline.sponsor_id, v_upline.level, p_deposit_id;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Trigger para depósitos completados
CREATE OR REPLACE FUNCTION trigger_deposit_completed()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Determinar el status anterior (NULL para INSERTs)
    v_old_status := CASE 
        WHEN TG_OP = 'INSERT' THEN NULL
        ELSE OLD.status
    END;

    -- Ejecutar solo si el status es 'completed' y antes no lo era
    IF NEW.status = 'completed'
       AND (v_old_status IS NULL OR v_old_status != 'completed') THEN

        -- Actualizar wallet del usuario que depositó
        INSERT INTO wallets (user_id, balance_invertido)
        VALUES (NEW.user_id, NEW.amount)
        ON CONFLICT (user_id) DO UPDATE
        SET balance_invertido = wallets.balance_invertido + NEW.amount;

        -- DISTRIBUIR COMISIONES MLM
        PERFORM distribute_deposit_commissions(NEW.id);
        
        RAISE NOTICE 'Comisiones distribuidas para depósito: %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deposit_completed
    AFTER INSERT OR UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_deposit_completed();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar is_active en profiles cuando cambia balance_invertido en wallets
CREATE OR REPLACE FUNCTION update_is_active()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar is_active en profiles basado en balance_invertido de wallets
    UPDATE profiles
    SET is_active = (COALESCE(NEW.balance_invertido, 0) > 0)
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_is_active
    AFTER INSERT OR UPDATE OF balance_invertido ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_is_active();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. FUNCIONES RPC PARA EL DASHBOARD
-- ============================================================================

-- Resumen del dashboard del usuario
CREATE OR REPLACE FUNCTION get_user_dashboard_summary(p_user_id UUID)
RETURNS TABLE (
    username TEXT,
    email TEXT,
    referral_code TEXT,
    sponsor_username TEXT,
    joined_date TIMESTAMPTZ,
    total_referrals INT,
    level_1_count INT,
    level_2_count INT,
    level_3_count INT,
    balance_disponible NUMERIC,
    balance_invertido NUMERIC,
    total_retirado NUMERIC,
    total_comisiones NUMERIC,
    total_earnings NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.username,
        p.email,
        p.referral_code,
        sp.username AS sponsor_username,
        p.created_at AS joined_date,
        COALESCE(ref_stats.total_referrals, 0) AS total_referrals,
        COALESCE(ref_stats.level_1, 0) AS level_1_count,
        COALESCE(ref_stats.level_2, 0) AS level_2_count,
        COALESCE(ref_stats.level_3, 0) AS level_3_count,
        COALESCE(w.balance_disponible, 0) AS balance_disponible,
        COALESCE(w.balance_invertido, 0) AS balance_invertido,
        COALESCE(w.total_retirado, 0) AS total_retirado,
        COALESCE(w.total_comisiones, 0) AS total_comisiones,
        COALESCE(earn_stats.total_earnings, 0) AS total_earnings
    FROM profiles p
    LEFT JOIN profiles sp ON p.sponsor_id = sp.id
    LEFT JOIN wallets w ON p.id = w.user_id
    LEFT JOIN (
        SELECT 
            sponsor_id,
            COUNT(*) FILTER (WHERE level = 1) AS level_1,
            COUNT(*) FILTER (WHERE level = 2) AS level_2,
            COUNT(*) FILTER (WHERE level = 3) AS level_3,
            COUNT(*) AS total_referrals
        FROM referrals
        GROUP BY sponsor_id
    ) ref_stats ON p.id = ref_stats.sponsor_id
    LEFT JOIN (
        SELECT 
            user_id,
            SUM(amount) AS total_earnings
        FROM mlm_commissions
        WHERE is_paid = TRUE
        GROUP BY user_id
    ) earn_stats ON p.id = earn_stats.user_id
    WHERE p.id = p_user_id;
END;
$$;

-- Obtener transacciones del usuario
CREATE OR REPLACE FUNCTION get_user_transactions(p_user_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    type TEXT,
    amount NUMERIC,
    description TEXT,
    reference TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.description,
        t.reference,
        t.created_at
    FROM transactions t
    WHERE t.user_id = p_user_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Árbol de referidos recursivo
CREATE OR REPLACE FUNCTION get_referrals_tree_recursive(p_user_id UUID)
RETURNS TABLE (
    referred_id UUID,
    username TEXT,
    email TEXT,
    level INT,
    joined_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE referral_tree AS (
        -- Nivel 1: referidos directos
        SELECT 
            p.id AS referred_id,
            p.username,
            p.email,
            1 AS level,
            p.created_at AS joined_date
        FROM profiles p
        WHERE p.sponsor_id = p_user_id
        
        UNION ALL
        
        -- Niveles 2 y 3: referidos de referidos
        SELECT 
            p.id,
            p.username,
            p.email,
            rt.level + 1,
            p.created_at
        FROM profiles p
        INNER JOIN referral_tree rt ON p.sponsor_id = rt.referred_id
        WHERE rt.level < 3
    )
    SELECT * FROM referral_tree;
END;
$$;

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mlm_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver su propio perfil"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden ver perfiles de sus sponsors"
    ON profiles FOR SELECT
    USING (id IN (SELECT sponsor_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para wallets
CREATE POLICY "Usuarios pueden ver su propia wallet"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar su propia wallet"
    ON wallets FOR UPDATE
    USING (auth.uid() = user_id);

-- Políticas para deposits
CREATE POLICY "Usuarios pueden ver sus propios depósitos"
    ON deposits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus propios depósitos"
    ON deposits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas para withdrawals
CREATE POLICY "Usuarios pueden ver sus propios retiros"
    ON withdrawals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear sus propios retiros"
    ON withdrawals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Políticas para transactions
CREATE POLICY "Usuarios pueden ver sus propias transacciones"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Políticas para mlm_commissions
CREATE POLICY "Usuarios pueden ver sus propias comisiones"
    ON mlm_commissions FOR SELECT
    USING (auth.uid() = user_id);

-- Políticas para referrals
CREATE POLICY "Usuarios pueden ver sus propios referidos"
    ON referrals FOR SELECT
    USING (auth.uid() = sponsor_id);

-- ============================================================================
-- 10. FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE AL REGISTRARSE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_user_profile(
    p_user_id UUID,
    p_username TEXT,
    p_email TEXT,
    p_sponsor_id UUID DEFAULT NULL,
    p_referral_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_referral_code TEXT;
    v_sponsor_exists UUID;
BEGIN
    -- Generar código de referido único
    v_new_referral_code := UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8));
    
    -- Verificar si el sponsor existe
    IF p_sponsor_id IS NOT NULL THEN
        SELECT id INTO v_sponsor_exists
        FROM profiles
        WHERE id = p_sponsor_id;
    END IF;
    
    -- Insertar perfil (sin campos de balance, esos van en wallets)
    INSERT INTO profiles (
        id,
        username,
        email,
        sponsor_id,
        referral_code,
        referral_count,
        is_active
    ) VALUES (
        p_user_id,
        p_username,
        p_email,
        CASE WHEN v_sponsor_exists IS NOT NULL THEN p_sponsor_id ELSE NULL END,
        v_new_referral_code,
        0,
        FALSE  -- is_active inicialmente en FALSE
    );
    
    -- Crear wallet
    INSERT INTO wallets (user_id, balance_disponible, balance_invertido, total_retirado, total_comisiones)
    VALUES (p_user_id, 0, 0, 0, 0);
    
    -- Registrar referido si hay sponsor
    IF v_sponsor_exists IS NOT NULL THEN
        INSERT INTO referrals (sponsor_id, referred_id, level)
        VALUES (p_sponsor_id, p_user_id, 1)
        ON CONFLICT (sponsor_id, referred_id) DO NOTHING;
        
        -- Actualizar contador de referidos del sponsor
        UPDATE profiles
        SET referral_count = referral_count + 1
        WHERE id = p_sponsor_id;
    END IF;
    
    RETURN p_user_id;
END;
$$;

-- ============================================================================
-- 11. DATOS DE PRUEBA (OPCIONAL)
-- ============================================================================

-- Descomentar para insertar datos de prueba

-- Usuario principal (admin/sin sponsor)
-- INSERT INTO profiles (id, username, email, referral_code, sponsor_id)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@betwinpro90.com', 'ADMIN001', NULL);

-- Usuario de prueba: asa4
-- INSERT INTO profiles (id, username, email, referral_code, sponsor_id)
-- VALUES ('11111111-1111-1111-1111-111111111111', 'asa4', 'asa4@gmail.com', 'ASA4TEST', NULL);

-- Usuario de prueba: usuario2 (referido de asa4)
-- INSERT INTO profiles (id, username, email, referral_code, sponsor_id)
-- VALUES ('22222222-2222-2222-2222-222222222222', 'usuario2', 'usuario2@gmail.com', 'USER2TST', '11111111-1111-1111-1111-111111111111');

-- Usuario de prueba: usuario3 (referido de usuario2)
-- INSERT INTO profiles (id, username, email, referral_code, sponsor_id)
-- VALUES ('33333333-3333-3333-3333-333333333333', 'usuario3', 'usuario3@gmail.com', 'USER3TST', '22222222-2222-2222-2222-222222222222');

-- Crear wallets para los usuarios de prueba
-- INSERT INTO wallets (user_id) VALUES 
-- ('11111111-1111-1111-1111-111111111111'),
-- ('22222222-2222-2222-2222-222222222222'),
-- ('33333333-3333-3333-3333-333333333333');

-- Registrar referidos
-- INSERT INTO referrals (sponsor_id, referred_id, level) VALUES
-- ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1),
-- ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 1);

-- Actualizar contadores
-- UPDATE profiles SET referral_count = 1 WHERE id = '11111111-1111-1111-1111-111111111111';
-- UPDATE profiles SET referral_count = 1 WHERE id = '22222222-2222-2222-2222-222222222222';

-- ============================================================================
-- 12. VISTAS DE VERIFICACIÓN
-- ============================================================================

-- Vista para ver resumen de usuarios
CREATE OR REPLACE VIEW user_summary AS
SELECT 
    p.id,
    p.username,
    p.email,
    p.referral_code,
    sp.username AS sponsor_username,
    p.referral_count,
    COALESCE(w.balance_disponible, 0) AS balance_disponible,
    COALESCE(w.balance_invertido, 0) AS balance_invertido,
    COALESCE(w.total_comisiones, 0) AS total_comisiones,
    p.created_at
FROM profiles p
LEFT JOIN profiles sp ON p.sponsor_id = sp.id
LEFT JOIN wallets w ON p.id = w.user_id;

-- Vista para ver comisiones por usuario
CREATE OR REPLACE VIEW commission_summary AS
SELECT 
    p.id,
    p.username,
    COUNT(mc.id) AS total_comisiones,
    COALESCE(SUM(mc.amount), 0) AS monto_total,
    COALESCE(SUM(mc.amount) FILTER (WHERE mc.is_paid = TRUE), 0) AS monto_pagado
FROM profiles p
LEFT JOIN mlm_commissions mc ON p.id = mc.user_id
GROUP BY p.id, p.username;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
