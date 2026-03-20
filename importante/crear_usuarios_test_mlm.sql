-- ==========================================
-- BetWinPro90 - Script para crear usuarios de prueba MLM
-- ==========================================
-- Este script usa la función RPC create_user_profile

-- ==========================================
-- PASO 1: Crear usuario RAÍZ (Nivel 0)
-- ==========================================
DO $$
DECLARE
    root_user_id UUID;
BEGIN
    -- Verificar si ya existe
    SELECT id INTO root_user_id FROM auth.users WHERE email = 'test.mlm.raiz@test.com';
    
    IF root_user_id IS NULL THEN
        -- Crear usuario en auth.users
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
        VALUES (
            gen_random_uuid(),
            'test.mlm.raiz@test.com',
            crypt('Password123!', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{}'::jsonb,
            'authenticated'
        ) RETURNING id INTO root_user_id;
        
        -- Crear perfil usando RPC
        PERFORM create_user_profile(
            p_user_id => root_user_id,
            p_username => 'test_raiz',
            p_email => 'test.mlm.raiz@test.com',
            p_sponsor_id => NULL,
            p_referral_code => 'RAIZ123'
        );
        
        RAISE NOTICE 'Usuario raiz creado: test.mlm.raiz@test.com';
    ELSE
        RAISE NOTICE 'Usuario raiz ya existe';
    END IF;
END $$;

-- ==========================================
-- PASO 2: Crear Nivel 1 (3 referidos directos)
-- ==========================================
DO $$
DECLARE
    root_id UUID;
    user_id UUID;
BEGIN
    -- Obtener ID del root
    SELECT id INTO root_id FROM profiles WHERE email = 'test.mlm.raiz@test.com';
    
    -- Nivel 1A
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel1a@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    
    PERFORM create_user_profile(user_id, 'test_1a', 'test.mlm.nivel1a@test.com', root_id, 'N1A123');
    
    -- Nivel 1B
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel1b@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    
    PERFORM create_user_profile(user_id, 'test_1b', 'test.mlm.nivel1b@test.com', root_id, 'N1B123');
    
    -- Nivel 1C
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel1c@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    
    PERFORM create_user_profile(user_id, 'test_1c', 'test.mlm.nivel1c@test.com', root_id, 'N1C123');
    
    RAISE NOTICE 'Nivel 1 creado: 3 usuarios';
END $$;

-- ==========================================
-- PASO 3: Crear Nivel 2
-- ==========================================
DO $$
DECLARE
    nivel1a_id UUID;
    nivel1b_id UUID;
    user_id UUID;
BEGIN
    SELECT id INTO nivel1a_id FROM profiles WHERE email = 'test.mlm.nivel1a@test.com';
    SELECT id INTO nivel1b_id FROM profiles WHERE email = 'test.mlm.nivel1b@test.com';
    
    -- Nivel 2A y 2B (referidos de 1A)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel2a@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_2a', 'test.mlm.nivel2a@test.com', nivel1a_id, 'N2A123');
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel2b@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_2b', 'test.mlm.nivel2b@test.com', nivel1a_id, 'N2B123');
    
    -- Nivel 2C (referido de 1B)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel2c@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_2c', 'test.mlm.nivel2c@test.com', nivel1b_id, 'N2C123');
    
    RAISE NOTICE 'Nivel 2 creado: 3 usuarios';
END $$;

-- ==========================================
-- PASO 4: Crear Nivel 3
-- ==========================================
DO $$
DECLARE
    nivel2a_id UUID;
    nivel2b_id UUID;
    nivel2c_id UUID;
    user_id UUID;
BEGIN
    SELECT id INTO nivel2a_id FROM profiles WHERE email = 'test.mlm.nivel2a@test.com';
    SELECT id INTO nivel2b_id FROM profiles WHERE email = 'test.mlm.nivel2b@test.com';
    SELECT id INTO nivel2c_id FROM profiles WHERE email = 'test.mlm.nivel2c@test.com';
    
    -- Nivel 3A (referido de 2A)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel3a@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_3a', 'test.mlm.nivel3a@test.com', nivel2a_id, 'N3A123');
    
    -- Nivel 3B (referido de 2B)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel3b@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_3b', 'test.mlm.nivel3b@test.com', nivel2b_id, 'N3B123');
    
    -- Nivel 3C (referido de 2C)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud)
    VALUES (gen_random_uuid(), 'test.mlm.nivel3c@test.com', crypt('Password123!', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email"}'::jsonb, '{}'::jsonb, 'authenticated')
    RETURNING id INTO user_id;
    PERFORM create_user_profile(user_id, 'test_3c', 'test.mlm.nivel3c@test.com', nivel2c_id, 'N3C123');
    
    RAISE NOTICE 'Nivel 3 creado: 3 usuarios';
END $$;

-- ==========================================
-- PASO 5: Crear depósitos para activar comisiones
-- ==========================================
DO $$
DECLARE
    nivel1a_id UUID;
    nivel1b_id UUID;
    nivel1c_id UUID;
    nivel2a_id UUID;
    nivel2b_id UUID;
    nivel2c_id UUID;
BEGIN
    SELECT id INTO nivel1a_id FROM profiles WHERE email = 'test.mlm.nivel1a@test.com';
    SELECT id INTO nivel1b_id FROM profiles WHERE email = 'test.mlm.nivel1b@test.com';
    SELECT id INTO nivel1c_id FROM profiles WHERE email = 'test.mlm.nivel1c@test.com';
    SELECT id INTO nivel2a_id FROM profiles WHERE email = 'test.mlm.nivel2a@test.com';
    SELECT id INTO nivel2b_id FROM profiles WHERE email = 'test.mlm.nivel2b@test.com';
    SELECT id INTO nivel2c_id FROM profiles WHERE email = 'test.mlm.nivel2c@test.com';
    
    INSERT INTO deposits (user_id, amount, currency, status, payment_method, completed_at)
    VALUES 
        (nivel1a_id, 100, 'USD', 'completed', 'simulado', NOW()),
        (nivel1b_id, 200, 'USD', 'completed', 'simulado', NOW()),
        (nivel1c_id, 150, 'USD', 'completed', 'simulado', NOW()),
        (nivel2a_id, 100, 'USD', 'completed', 'simulado', NOW()),
        (nivel2b_id, 150, 'USD', 'completed', 'simulado', NOW()),
        (nivel2c_id, 250, 'USD', 'completed', 'simulado', NOW());
    
    RAISE NOTICE 'Depositos creados para usuarios de nivel 1 y 2';
END $$;

-- ==========================================
-- VERIFICACION: Mostrar estructura creada
-- ==========================================
SELECT '========================================' as info;
SELECT 'ESTRUCTURA MLM CREADA EXITOSAMENTE' as info;
SELECT '========================================' as info;

-- Ver arbol completo desde el root
SELECT 'ARBOL DE REFERIDOS (desde root):' as info;
SELECT 
    level,
    username,
    email,
    w.total_invertido as invertido,
    joined_date
FROM get_referrals_tree_recursive(
    (SELECT id FROM profiles WHERE email = 'test.mlm.raiz@test.com')::uuid
) r
JOIN wallets w ON r.referred_id = w.user_id
ORDER BY level, joined_date;

-- Ver conteo por nivel
SELECT 'CONTEO POR NIVEL:' as info;
SELECT 
    level,
    COUNT(*) as cantidad,
    SUM(w.total_invertido) as total_invertido
FROM get_referrals_tree_recursive(
    (SELECT id FROM profiles WHERE email = 'test.mlm.raiz@test.com')::uuid
) r
JOIN wallets w ON r.referred_id = w.user_id
GROUP BY level
ORDER BY level;

-- Ver comisiones distribuidas
SELECT 'COMISIONES MLM DISTRIBUIDAS:' as info;
SELECT 
    p.username,
    p.email,
    COUNT(c.id) as comisiones,
    COALESCE(SUM(c.amount), 0) as total_comisiones
FROM profiles p
LEFT JOIN mlm_commissions c ON p.id = c.user_id
WHERE p.email LIKE 'test.mlm.%'
GROUP BY p.id, p.username, p.email
ORDER BY total_comisiones DESC;

-- Resumen final
SELECT 'RESUMEN DE USUARIOS:' as info;
SELECT 
    email,
    username,
    referral_code,
    CASE WHEN sponsor_id IS NOT NULL THEN 'Si' ELSE 'No' END as tiene_sponsor,
    (SELECT total_invertido FROM wallets WHERE wallets.user_id = profiles.id) as invertido
FROM profiles
WHERE email LIKE 'test.mlm.%'
ORDER BY email;
