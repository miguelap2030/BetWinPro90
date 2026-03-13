# Cambios en la Estructura de la Base de Datos

## 📋 Resumen de Cambios

### Tabla `profiles` - Campos Eliminados

Se eliminaron los siguientes campos redundantes que ya existen en la tabla `wallets`:

| Campo | Tipo | Razón de eliminación |
|-------|------|---------------------|
| `balance_disponible` | NUMERIC(18, 2) | Duplicado en `wallets.balance_disponible` |
| `balance_invertido` | NUMERIC(18, 2) | Duplicado en `wallets.balance_invertido` |
| `total_comisiones` | NUMERIC(18, 2) | Duplicado en `wallets.total_comisiones` |
| `total_retirado` | NUMERIC(18, 2) | Duplicado en `wallets.total_retirado` |

### Tabla `profiles` - Campo Agregado

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `is_active` | BOOLEAN | FALSE | TRUE si el usuario tiene saldo en `balance_invertido` |

## 🎯 Nuevo Campo: `is_active`

### Propósito
Indicar si un usuario está "activo" en el sistema de inversiones. Un usuario se considera activo cuando tiene saldo invertido.

### Comportamiento
- **Default**: `FALSE` (nuevos usuarios comienzan inactivos)
- **Se activa**: Cuando `wallets.balance_invertido > 0`
- **Se desactiva**: Cuando `wallets.balance_invertido = 0`

### Actualización Automática
El campo se actualiza automáticamente mediante el trigger `trg_update_is_active`:

```sql
CREATE TRIGGER trg_update_is_active
    AFTER INSERT OR UPDATE OF balance_invertido ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_is_active();
```

### Ejemplos de Uso

```sql
-- Usuarios activos (con inversión)
SELECT * FROM profiles WHERE is_active = TRUE;

-- Usuarios inactivos (sin inversión)
SELECT * FROM profiles WHERE is_active = FALSE;

-- Contar usuarios activos
SELECT COUNT(*) FROM profiles WHERE is_active = TRUE;
```

## 📊 Estructura Actual de `profiles`

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    sponsor_id UUID REFERENCES profiles(id),
    referral_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 💾 Tabla `wallets` (Fuente de Verdad para Balances)

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    balance_disponible NUMERIC(18, 2) DEFAULT 0,  -- Saldo para usar
    balance_invertido NUMERIC(18, 2) DEFAULT 0,   -- Saldo generando 3% diario
    total_retirado NUMERIC(18, 2) DEFAULT 0,      -- Total retirado históricamente
    total_comisiones NUMERIC(18, 2) DEFAULT 0,    -- Total de comisiones ganadas
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔄 Migración de Datos

Si tienes una base de datos existente con los campos antiguos, ejecuta:

```sql
-- 1. Agregar campo is_active
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- 2. Actualizar is_active basado en balance_invertido
UPDATE profiles p
SET is_active = (
    SELECT COALESCE(w.balance_invertido, 0) > 0
    FROM wallets w
    WHERE w.user_id = p.id
);

-- 3. Eliminar campos redundantes
ALTER TABLE profiles DROP COLUMN IF EXISTS balance_disponible;
ALTER TABLE profiles DROP COLUMN IF EXISTS balance_invertido;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_comisiones;
ALTER TABLE profiles DROP COLUMN IF EXISTS total_retirado;

-- 4. Crear trigger para actualización automática
CREATE OR REPLACE FUNCTION update_is_active()
RETURNS TRIGGER AS $$
BEGIN
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
```

## 🛠️ Funciones Actualizadas

### `create_user_profile()`
Ahora crea el perfil sin campos de balance:

```sql
INSERT INTO profiles (
    id, username, email, sponsor_id, referral_code,
    referral_count, is_active
) VALUES (
    p_user_id, p_username, p_email, p_sponsor_id,
    v_new_referral_code, 0, FALSE
);
```

### `get_user_dashboard_summary()`
Obtiene los balances desde la tabla `wallets`:

```sql
SELECT
    p.username, p.email, p.referral_code,
    sp.username AS sponsor_username,
    w.balance_disponible, w.balance_invertido,
    w.total_retirado, w.total_comisiones,
    -- ... más campos
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
-- ...
```

## ✅ Beneficios de los Cambios

1. **Normalización de datos**: Los balances están en un solo lugar (`wallets`)
2. **Consistencia**: No hay riesgo de que los datos se desincronicen entre tablas
3. **Claridad**: `is_active` indica rápidamente el estado del usuario
4. **Automatización**: El trigger mantiene `is_active` actualizado automáticamente

## 📝 Ejemplos de Consultas

### Usuarios activos con su balance
```sql
SELECT 
    p.username,
    p.email,
    p.is_active,
    w.balance_disponible,
    w.balance_invertido
FROM profiles p
JOIN wallets w ON p.id = w.user_id
WHERE p.is_active = TRUE;
```

### Total de usuarios activos vs inactivos
```sql
SELECT 
    is_active,
    COUNT(*) as cantidad
FROM profiles
GROUP BY is_active;
```

### Usuarios que nunca han invertido
```sql
SELECT 
    p.username,
    p.email,
    p.created_at
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
WHERE w.balance_invertido = 0 OR w.balance_invertido IS NULL;
```

---

**Fecha de actualización:** 2024
**Versión:** 2.0.0
