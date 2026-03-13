# 📋 Instrucciones para Solucionar Errores de Supabase

## 🔍 Problemas Identificados

1. **Error en el dashboard de Supabase**: Las políticas RLS no permitían la inserción de `profiles` durante el registro
2. **No se creaba el profile del usuario**: Faltaba política RLS para `INSERT` en `profiles`
3. **No se guardaba el sponsor_id**: El código del referido no se estaba usando correctamente para establecer el `sponsor_id`

---

## ✅ Solución Implementada

### 1. Archivos Modificados

- **`src/components/SignUp.jsx`**: 
  - Busca el sponsor por `referral_code` **ANTES** de crear el usuario
  - Valida que el código de referido existe en la base de datos
  - Inserta directamente con `supabase.from('profiles').insert()` con manejo de errores
  - Guarda correctamente el `sponsor_id` para el seguimiento MLM
  - Muestra logs detallados con emojis para fácil depuración (🔍, ✅, ❌)

- **`src/main.jsx`**: 
  - Agregada ruta `/verify-profiles` para verificar el sistema

- **`importante/ACTUALIZACION_RLS.sql`**: 
  - Políticas RLS actualizadas para todas las tablas
  - Funciones RPC seguras (`SECURITY DEFINER`) para crear perfiles y wallets
  - Trigger para crear wallet automáticamente al crear un perfil
  - Índices optimizados para consultas MLM
  - Función `create_user_profile` mejorada con `RETURNING` y logs

### 2. Archivos Creados

- **`src/pages/VerifyProfiles.jsx`**: 
  - Página para verificar que los perfiles se crean con el `sponsor_id` correcto
  - Muestra todos los usuarios, sus códigos de referido y quién los patrocinó
  - Accesible en `/verify-profiles`

---

## 🚀 Pasos para Aplicar la Solución

### Paso 1: Ejecutar el Script SQL en Supabase

1. Ve al [Dashboard de Supabase](https://emlahqylpuudcvwjgncv.supabase.co)
2. Navega a **SQL Editor**
3. Copia y pega el contenido de `importante/ACTUALIZACION_RLS.sql`
4. Ejecuta el script completo

**Nota**: El script es seguro e idempotente (puede ejecutarse múltiples veces sin problemas).

### Paso 2: Verificar que las Funciones RPC Existen

Ejecuta esta consulta en el SQL Editor de Supabase:

```sql
-- Verificar funciones RPC
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('create_user_profile', 'create_user_wallet');
```

Deberías ver ambas funciones listadas.

### Paso 3: Verificar Políticas RLS

```sql
-- Ver políticas creadas
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename IN ('profiles', 'wallets')
ORDER BY tablename, policyname;
```

### Paso 4: Probar el Registro

1. Abre la aplicación en desarrollo (`npm run dev`)
2. Ve a la página de registro (`/signup`)
3. Registra un nuevo usuario con los siguientes datos de prueba:
   - Email: `test1@ejemplo.com`
   - Password: `123456`
   - Confirm Password: `123456`
   - Referral Code: (déjalo vacío para el primer usuario)

4. Verifica en el Dashboard de Supabase:
   - **Authentication → Users**: El usuario debe aparecer
   - **Table Editor → profiles**: El perfil debe estar creado
   - **Table Editor → wallets**: La wallet debe estar creada con saldos en 0

### Paso 5: Probar Sistema MLM con Referido

1. Obtén el `referral_code` del primer usuario:
   ```sql
   SELECT id, username, email, referral_code FROM profiles LIMIT 1;
   ```

2. Registra un segundo usuario usando ese código de referido

3. Verifica que el `sponsor_id` del segundo usuario apunte al primer usuario:
   ```sql
   SELECT 
       p.id,
       p.username,
       p.referral_code,
       p.sponsor_id,
       s.username AS sponsor_username
   FROM profiles p
   LEFT JOIN profiles s ON p.sponsor_id = s.id
   ORDER BY p.created_at DESC
   LIMIT 5;
   ```

4. Verifica la tabla `referrals` para ver las relaciones MLM:
   ```sql
   SELECT 
       r.level,
       s.username AS sponsor,
       p.username AS referred
   FROM referrals r
   JOIN profiles s ON r.sponsor_id = s.id
   JOIN profiles p ON r.referred_id = p.id
   ORDER BY r.created_at DESC;
   ```

---

## 📊 Estructura del Sistema MLM

### Niveles de Comisión

| Nivel | Porcentaje | Descripción |
|-------|------------|-------------|
| 1     | 5%         | Referido directo |
| 2     | 3%         | Referido de tu referido |
| 3     | 1%         | Tercer nivel |

### Tablas Involucradas

1. **`profiles`**: 
   - `sponsor_id`: Quién lo invitó
   - `referral_code`: Código único para invitar

2. **`referrals`**: 
   - Tabla de adyacencia para consultas rápidas
   - Almacena relaciones hasta nivel 3
   - Se actualiza automáticamente con triggers

3. **`mlm_commissions`**: 
   - Registra todas las comisiones pagadas
   - Tipos: `deposit` (por depósito directo) y `residual` (por ganancias diarias)

---

## 🐛 Depuración de Errores

### Si el perfil no se crea:

1. Abre la consola del navegador (F12)
2. Busca mensajes de error que comiencen con `Error creando perfil:`
3. Verifica en Supabase → Logs si hay errores de RLS

### Si el sponsor_id es NULL:

1. Verifica que el `referral_code` ingresado existe:
   ```sql
   SELECT * FROM profiles WHERE referral_code = 'CODIGO_INGRESADO';
   ```

2. Asegúrate de que el código se convierte a mayúsculas (el sistema es case-sensitive)

### Si las comisiones no se distribuyen:

1. Verifica que el trigger existe:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'trg_maintain_referral_tree';
   ```

2. Verifica que la función `calculate_deposit_commissions` existe:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'calculate_deposit_commissions';
   ```

---

## 📝 Consultas Útiles para Verificar el Sistema

### Ver árbol completo de un usuario

```sql
-- Referidos hacia abajo (downline)
SELECT * FROM get_downline_referrals('UUID_DEL_USUARIO', 3);

-- Sponsors hacia arriba (upline)
SELECT * FROM get_upline_sponsors('UUID_DEL_USUARIO', 3);
```

### Ver comisiones ganadas por usuario

```sql
SELECT 
    p.username,
    SUM(mc.amount) AS total_comisiones,
    COUNT(mc.id) AS cantidad_comisiones
FROM mlm_commissions mc
JOIN profiles p ON mc.user_id = p.id
WHERE mc.user_id = 'UUID_DEL_USUARIO'
GROUP BY p.username;
```

### Ver ranking de referidos

```sql
SELECT * FROM mv_referral_ranking LIMIT 20;
```

---

## ✨ Resumen de Cambios

| Archivo | Cambio | Propósito |
|---------|--------|-----------|
| `SignUp.jsx` | Búsqueda de sponsor antes de registro | Guardar correctamente el `sponsor_id` |
| `SignUp.jsx` | Uso de funciones RPC | Evitar errores de RLS |
| `ACTUALIZACION_RLS.sql` | Políticas RLS actualizadas | Permitir inserción durante registro |
| `ACTUALIZACION_RLS.sql` | Funciones `create_user_profile` y `create_user_wallet` | Creación segura de perfiles |
| `ACTUALIZACION_RLS.sql` | Trigger `trg_create_wallet_on_profile_insert` | Crear wallet automáticamente |

---

## 🔗 Enlaces Importantes

- **Dashboard Supabase**: https://emlahqylpuudcvwjgncv.supabase.co
- **Documentación RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Documentación RPC**: https://supabase.com/docs/guides/database/functions

---

**Fecha de actualización**: 2026-03-11
**Versión**: 1.0
