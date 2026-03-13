# BetWinPro90 - Guía de Recuperación de Base de Datos

## 📋 Resumen del Sistema

BetWinPro90 es una plataforma que combina:
- **Inversión en criptomonedas** (3% diario sobre capital invertido)
- **Sistema MLM unilevel** (5%, 3%, 1% por 3 niveles)
- **Apuestas deportivas** (próximamente)

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario con información de referido |
| `wallets` | Balances y totales de cada usuario |
| `deposits` | Depósitos de los usuarios |
| `withdrawals` | Retiros de los usuarios |
| `transactions` | Historial completo de transacciones |
| `transfers_internas` | Transferencias entre disponible/invertido |
| `mlm_commissions` | Comisiones MLM distribuidas |
| `referrals` | Red de referidos por niveles |

### Sistema MLM

- **Nivel 1**: 5% del depósito de referidos directos
- **Nivel 2**: 3% del depósito de referidos de nivel 1
- **Nivel 3**: 1% del depósito de referidos de nivel 2

## 🚀 Instrucciones de Recuperación

### Paso 1: Ejecutar el Script Principal

1. Ve a tu proyecto en Supabase: https://alyboipgbixoufqftizd.supabase.co/project/sql
2. Copia TODO el contenido del archivo `importante/BETWINPRO90_BASE_DE_DATOS_COMPLETA.sql`
3. Pega en el editor SQL de Supabase
4. Ejecuta el script completo

### Paso 2: Verificar que todo se creó correctamente

Ejecuta estas consultas de verificación:

```sql
-- Verificar tablas creadas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar funciones
SELECT proname FROM pg_proc 
WHERE proname IN (
    'get_upline_sponsors',
    'distribute_deposit_commissions',
    'trigger_deposit_completed',
    'get_user_dashboard_summary',
    'get_user_transactions',
    'get_referrals_tree_recursive',
    'create_user_profile'
);

-- Verificar triggers
SELECT tgname FROM pg_trigger 
WHERE tgname = 'trg_deposit_completed';
```

### Paso 3: Crear Usuario de Prueba (Opcional)

Para probar el sistema, crea un usuario manual:

```sql
-- 1. Crear usuario en auth.users (desde Dashboard de Supabase)
-- Ve a Authentication > Users > Add User
-- Crea: asa4@gmail.com / 123456

-- 2. Obtener el ID del usuario creado
SELECT id, email FROM auth.users WHERE email = 'asa4@gmail.com';

-- 3. Crear perfil con el ID obtenido
SELECT create_user_profile(
    'PEGAR_AQUI_EL_ID_DEL_USUARIO',
    'asa4',
    'asa4@gmail.com',
    NULL,  -- sponsor_id (NULL si no tiene sponsor)
    NULL   -- se generará automáticamente
);

-- 4. Verificar
SELECT * FROM user_summary WHERE email = 'asa4@gmail.com';
```

### Paso 4: Configurar Trigger de Auth (Opcional pero recomendado)

Para que los perfiles se creen automáticamente al registrarse:

```sql
-- Función que se ejecuta al crear usuario en auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        username,
        email,
        referral_code,
        sponsor_id,
        balance_disponible,
        balance_invertido,
        total_retirado,
        total_comisiones
    )
    SELECT 
        NEW.id,
        SPLIT_PART(NEW.email, '@', 1),
        NEW.email,
        UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8)),
        NULL,
        0, 0, 0, 0;
    
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

## 🧪 Probar el Sistema

### 1. Crear Depósito de Prueba

```sql
-- Obtener ID de usuario
SELECT id FROM profiles WHERE username = 'asa4';

-- Crear depósito (reemplaza el UUID)
INSERT INTO deposits (user_id, amount, status, payment_method)
VALUES ('UUID_DEL_USUARIO', 100, 'completed', 'simulado');

-- Verificar que se distribuyeron comisiones
SELECT * FROM mlm_commissions ORDER BY created_at DESC LIMIT 10;

-- Verificar transacciones
SELECT * FROM transactions WHERE type = 'commission' ORDER BY created_at DESC LIMIT 10;

-- Verificar wallets
SELECT * FROM wallets WHERE total_comisiones > 0;
```

### 2. Probar MLM con Múltiples Niveles

```sql
-- Crear red: admin -> asa4 -> usuario2 -> usuario3

-- 1. asa4 deposita $100 (admin recibe 5% si es su sponsor)
-- 2. usuario2 deposita $100 (asa4 recibe 5%, admin recibe 3%)
-- 3. usuario3 deposita $100 (usuario2 recibe 5%, asa4 recibe 3%, admin recibe 1%)

-- Ver resumen de comisiones
SELECT * FROM commission_summary ORDER BY monto_total DESC;
```

## 📊 Consultas Útiles

### Ver todos los usuarios con sus balances

```sql
SELECT * FROM user_summary ORDER BY created_at DESC;
```

### Ver comisiones por usuario

```sql
SELECT * FROM commission_summary ORDER BY monto_total DESC;
```

### Ver depósitos sin comisiones (si hay error)

```sql
SELECT d.*, p.username
FROM deposits d
JOIN profiles p ON d.user_id = p.id
WHERE d.status = 'completed'
  AND NOT EXISTS (
      SELECT 1 FROM mlm_commissions mc 
      WHERE mc.related_deposit_id = d.id
  );
```

### Reprocesar comisiones perdidas

```sql
-- Ejecutar para depósitos sin comisiones
SELECT distribute_deposit_commissions(d.id)
FROM deposits d
WHERE d.status = 'completed'
  AND NOT EXISTS (
      SELECT 1 FROM mlm_commissions mc 
      WHERE mc.related_deposit_id = d.id
  );
```

## 🔧 Solución de Problemas

### Problema: Las comisiones no se distribuyen

**Causa**: El trigger solo funciona en UPDATE, no en INSERT

**Solución**: El script ya incluye el trigger corregido para `INSERT OR UPDATE`

### Problema: Comisiones duplicadas

**Causa**: El trigger se ejecuta múltiples veces

**Solución**: La función `distribute_deposit_commissions` verifica si ya existe la comisión antes de insertar

### Problema: Error de RLS (Row Level Security)

**Causa**: Las políticas bloquean el acceso

**Solución**: Las funciones usan `SECURITY DEFINER` para bypass de RLS

### Problema: Usuario no tiene wallet

**Causa**: No se creó al registrar

**Solución**:
```sql
-- Crear wallets faltantes
INSERT INTO wallets (user_id)
SELECT p.id FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w WHERE w.user_id = p.id
);
```

## 📁 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `BETWINPRO90_BASE_DE_DATOS_COMPLETA.sql` | Script completo de creación |
| `TRIGGER_CORREGIDO_SIN_REFERENCE.sql` | Trigger corregido (ya incluido en el principal) |
| `DIAGNOSTICO_COMISIONES_ACTUAL.sql` | Consultas de diagnóstico |

## 🔐 Credenciales de Prueba

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | admin@betwinpro90.com | 123456 | Sin sponsor |
| Usuario 1 | asa4@gmail.com | 123456 | Referido de admin |
| Usuario 2 | usuario2@gmail.com | 123456 | Referido de asa4 |
| Usuario 3 | usuario3@gmail.com | 123456 | Referido de usuario2 |

## 📞 Soporte

Si encuentras problemas:

1. Ejecuta `DIAGNOSTICO_COMISIONES_ACTUAL.sql` para ver el estado
2. Revisa los logs en Supabase > Database > Logs
3. Verifica que todos los triggers estén creados

---

**Última actualización**: 2024
**Versión**: 1.0.0
