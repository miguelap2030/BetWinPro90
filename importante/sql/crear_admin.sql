-- ============================================
-- CREAR USUARIO ADMIN
-- ============================================
-- Email: admin2313@gmail.com
-- Password: 123456
-- Rol: admin
-- ============================================

-- Paso 1: Crear el usuario en auth.users
-- Nota: Esto requiere ejecutarse con privilegios de servicio o desde el Dashboard de Supabase

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin2313@gmail.com';
  v_password text := '123456';
BEGIN
  -- Intentar crear el usuario en auth.users
  -- Si ya existe, solo actualizar el rol
  
  -- Verificar si el usuario ya existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    -- Crear nuevo usuario en auth.users
    INSERT INTO auth.users (
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    )
    VALUES (
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"email": "admin2313@gmail.com"}'::jsonb,
      false,
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Usuario creado con ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Usuario ya existe con ID: %', v_user_id;
  END IF;
  
  -- Paso 2: Crear/Actualizar perfil en profiles
  INSERT INTO profiles (id, email, username, role, is_active, created_at, updated_at)
  VALUES (
    v_user_id,
    v_email,
    'admin2313',
    'admin',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    is_active = true,
    updated_at = NOW();
  
  RAISE NOTICE 'Perfil creado/actualizado con rol admin';
  
  -- Paso 3: Crear wallet si no existe
  INSERT INTO wallets (user_id, balance_disponible, balance_invertido, total_comisiones, total_retirado, created_at, updated_at)
  VALUES (v_user_id, 0, 0, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Wallet creada/verificada';
  
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar estas consultas para verificar:

-- 1. Verificar usuario en auth
SELECT id, email, created_at FROM auth.users WHERE email = 'admin2313@gmail.com';

-- 2. Verificar perfil y rol
SELECT p.id, p.email, p.username, p.role, p.is_active 
FROM profiles p 
WHERE p.email = 'admin2313@gmail.com';

-- 3. Verificar wallet
SELECT w.user_id, w.balance_disponible, w.balance_invertido 
FROM wallets w 
JOIN profiles p ON w.user_id = p.id 
WHERE p.email = 'admin2313@gmail.com';

-- 4. Verificar función is_user_admin
-- (Ejecutar después de iniciar sesión con este usuario)
-- SELECT is_user_admin();
