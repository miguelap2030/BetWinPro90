# SOLUCIÓN PROBLEMA SPONSOR_ID Y REFERIDOS

## Problema Detectado

Los nuevos usuarios que se registraban con un código de referido no aparecían en el árbol MLM del sponsor porque:

1. **El hook `useSignUp` usaba una consulta directa a `profiles`** para buscar el `sponsor_id` por `referral_code`
2. **Esta consulta podía estar bloqueada por RLS (Row Level Security)**, devolviendo `null` para `sponsor_id`
3. **La función RPC `get_referrals_tree_recursive` no devolvía los campos `balance_invertido` e `is_active`** que necesita el frontend

## Solución Implementada

### 1. Corrección del Hook `useSignUp` (src/hooks/useQueries.js)

**ANTES:**
```javascript
const { data: sponsorData } = await supabase
  .from('profiles')
  .select('id')
  .eq('referral_code', referralCode.toUpperCase().trim())
  .maybeSingle()
```

**DESPUÉS:**
```javascript
const { data: sponsorData, error: sponsorError } = await supabase
  .rpc('validate_referral_code', { p_referral_code: codigoNormalizado })
  .maybeSingle()
```

**Beneficios:**
- La función RPC `validate_referral_code` usa `SECURITY DEFINER` y bypass RLS
- Siempre devuelve el sponsor correcto si el código existe
- Incluye logging para debugging

### 2. Actualización de la Función RPC `get_referrals_tree_recursive`

**ANTES:** Solo devolvía `referred_id`, `username`, `email`, `level`, `joined_date`

**DESPUÉS:** Ahora devuelve también:
- `balance_invertido` (NUMERIC) - Saldo invertido del referido
- `is_active` (BOOLEAN) - Estado de activación del perfil

**SQL de la función actualizada:**
```sql
CREATE OR REPLACE FUNCTION get_referrals_tree_recursive(p_user_id UUID)
RETURNS TABLE (
  referred_id UUID,
  username TEXT,
  email TEXT,
  level INTEGER,
  joined_date TIMESTAMP WITH TIME ZONE,
  balance_invertido NUMERIC,
  is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE referral_tree AS (
    SELECT
        p.id AS referred_id,
        p.username,
        p.email,
        1 AS level,
        p.created_at AS joined_date,
        COALESCE(w.balance_invertido, 0) AS balance_invertido,
        p.is_active
    FROM profiles p
    LEFT JOIN wallets w ON p.id = w.user_id
    WHERE p.sponsor_id = p_user_id
      
    UNION ALL
      
    SELECT
        p.id,
        p.username,
        p.email,
        rt.level + 1,
        p.created_at,
        COALESCE(w.balance_invertido, 0),
        p.is_active
    FROM profiles p
    INNER JOIN referral_tree rt ON p.sponsor_id = rt.referred_id
    LEFT JOIN wallets w ON p.id = w.user_id
    WHERE rt.level < 3
  )
  SELECT * FROM referral_tree;
END;
$$;
```

### 3. Actualización del Componente `Equipo.jsx`

**ANTES:**
```javascript
const userData = referral.profiles || referral
const balanceInvertido = userData.balance_invertido ?? referral.balance_invertido ?? 0
```

**DESPUÉS:**
```javascript
// La función RPC devuelve los campos directamente (no anidados en profiles)
const balanceInvertido = referral.balance_invertido ?? 0
const isActive = referral.is_active !== false
```

**Acceso directo a los campos:**
```javascript
referral.email       // Directo de la RPC
referral.username    // Directo de la RPC
referral.level       // Directo de la RPC
referral.balance_invertido  // Ahora disponible
referral.is_active   // Ahora disponible
```

## Archivos Modificados

1. `src/hooks/useQueries.js` - Hook `useSignUp` corregido
2. `src/pages/Equipo.jsx` - Componente actualizado para usar campos directos
3. Función SQL `get_referrals_tree_recursive` - Actualizada en Supabase

## Verificación

Ejecutar el script de test:
```bash
node scripts/test-final.js
```

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Referidos encontrados (2 en el caso de asa22)
- ✅ Campos `balance_invertido` e `is_active` disponibles
- ✅ Frontend puede acceder directamente a los campos

## Flujo de Registro Correcto

1. Usuario ingresa email, password y **código de referido** (opcional)
2. Frontend valida el código con `validate_referral_code()` RPC
3. Si el código existe, obtiene el `sponsor_id` correctamente
4. Crea usuario en `auth.users`
5. Llama a `create_user_profile()` con el `sponsor_id` correcto
6. El perfil se guarda con `sponsor_id` vinculado
7. El nuevo usuario aparece automáticamente en el árbol MLM del sponsor

## Comisiones MLM

Con el `sponsor_id` correctamente configurado:
- ✅ Nivel 1: 5% de comisión para el sponsor directo
- ✅ Nivel 2: 3% de comisión para el sponsor del sponsor
- ✅ Nivel 3: 1% de comisión para el tercer nivel

Las comisiones se distribuyen automáticamente vía trigger `trg_deposit_completed` cuando un depósito cambia a `status = 'completed'`.

## Pruebas Recomendadas

1. **Registro con referido:**
   - Registrarse con el código `F9AB085B` (asa22)
   - Verificar que aparece en el árbol de asa22
   - Verificar que `sponsor_id` no es NULL

2. **Depósito y comisiones:**
   - Hacer un depósito de $100
   - Verificar que asa22 recibe $5 de comisión (5%)

3. **Árbol de 3 niveles:**
   - Usuario A refiere a Usuario B (Nivel 1 de A)
   - Usuario B refiere a Usuario C (Nivel 1 de B, Nivel 2 de A)
   - Usuario C refiere a Usuario D (Nivel 1 de C, Nivel 2 de B, Nivel 3 de A)
   - Verificar que A ve a D en su Nivel 3

---

**Fecha de solución:** 2026-03-19  
**Usuario de test:** asa22@gmail.com (ID: 8a9d5290-2fb4-4d4e-85bc-8fdfe662894f)
