# 🧪 Guía de Prueba - Registro con Referido

## Paso a Paso para Probar el Sistema MLM

### 1️⃣ Primer Usuario (Sin Sponsor)

1. Abre la aplicación: `npm run dev`
2. Ve a `/signup`
3. Registra un usuario **SIN** código de referido:
   - Email: `usuario1@test.com`
   - Password: `123456`
   - Confirm Password: `123456`
   - Referral Code: (déjalo vacío)

4. Abre la consola del navegador (F12) y verifica los logs:
   ```
   📝 Registrando usuario en Auth... usuario1@test.com
   ✅ Usuario Auth creado: uuid-del-usuario
   📋 Datos del perfil: { id, username, email, sponsor_id: null, referral_code }
   ✅ Perfil creado exitosamente
   🔗 Sponsor ID guardado: null
   ```

5. Ve a `/verify-profiles` y verifica:
   - El usuario aparece en la lista
   - Sponsor ID dice "Sin sponsor"
   - Tiene un referral_code único (ej: `X7K2M9P4`)

6. **Anota el referral_code** de este usuario para el siguiente paso

---

### 2️⃣ Segundo Usuario (CON Sponsor)

1. Ve a `/signup`
2. Registra un usuario **CON** código de referido:
   - Email: `usuario2@test.com`
   - Password: `123456`
   - Confirm Password: `123456`
   - **Referral Code: `X7K2M9P4`** (el código del primer usuario)

3. Abre la consola del navegador y verifica los logs:
   ```
   🔍 Buscando sponsor con código: X7K2M9P4
   ✅ Sponsor encontrado: { id: 'uuid...', username: 'usuario1_...', referral_code: 'X7K2M9P4' }
   📝 Registrando usuario en Auth... usuario2@test.com
   ✅ Usuario Auth creado: uuid-nuevo-usuario
   📋 Datos del perfil: { id, username, email, sponsor_id: 'uuid-del-sponsor', referral_code }
   ✅ Perfil creado exitosamente
   🔗 Sponsor ID guardado: uuid-del-sponsor
   ```

4. Ve a `/verify-profiles` y verifica:
   - El nuevo usuario aparece en la lista
   - **Sponsor ID muestra un UUID** (no dice "Sin sponsor")
   - **Sponsor muestra el username del primer usuario** con ícono ✓
   - Tiene su propio referral_code único

---

### 3️⃣ Tercer Usuario (Para verificar Nivel 2)

1. Ve a `/signup`
2. Registra otro usuario con el código del **segundo usuario**:
   - Email: `usuario3@test.com`
   - Password: `123456`
   - Referral Code: (el referral_code del usuario2)

3. Verifica en `/verify-profiles`:
   - Sponsor ID debe ser el ID del usuario2
   - Sponsor debe mostrar el username del usuario2

---

### 4️⃣ Verificar Relaciones MLM en Supabase

1. Ve al Dashboard de Supabase
2. Abre **SQL Editor**
3. Ejecuta:

```sql
-- Ver todos los perfiles con sus sponsors
SELECT 
    p.username AS usuario,
    p.referral_code,
    p.sponsor_id,
    s.username AS sponsor_username,
    CASE 
        WHEN p.sponsor_id IS NOT NULL THEN '✓ CON SPONSOR'
        ELSE '✗ SIN SPONSOR'
    END AS estado
FROM profiles p
LEFT JOIN profiles s ON p.sponsor_id = s.id
ORDER BY p.created_at;
```

4. Ejecuta para ver relaciones MLM:
```sql
-- Ver árbol de referidos
SELECT 
    r.level AS nivel,
    s.username AS sponsor,
    rft.username AS referido
FROM referrals r
JOIN profiles s ON r.sponsor_id = s.id
JOIN profiles rft ON r.referred_id = rft.id
ORDER BY r.created_at DESC;
```

---

## ✅ Checklist de Verificación

### En el Frontend (`/verify-profiles`):
- [ ] Los usuarios aparecen en la tabla
- [ ] Cada usuario tiene un referral_code único
- [ ] Los usuarios con referido muestran Sponsor ID (UUID)
- [ ] Los usuarios con referido muestran el nombre del Sponsor
- [ ] El estado es "Activo" para todos

### En Supabase (SQL):
- [ ] La tabla `profiles` tiene todos los usuarios
- [ ] La columna `sponsor_id` tiene valores (no NULL) para usuarios con referido
- [ ] La tabla `referrals` tiene las relaciones MLM (nivel 1, 2, 3)
- [ ] La tabla `wallets` tiene una fila por cada usuario

### En la Consola del Navegador:
- [ ] Aparece `🔍 Buscando sponsor con código: XXX`
- [ ] Aparece `✅ Sponsor encontrado: {...}` cuando el código es válido
- [ ] Aparece `🔗 Sponsor ID guardado: uuid-...` (no debe ser null si hay referido)

---

## 🐛 Posibles Problemas y Soluciones

### Problema: "Sponsor ID guardado: null" aunque se ingresó código

**Causa**: El código de referido no existe en la base de datos

**Solución**:
1. Verifica que el código está bien escrito (mayúsculas, sin espacios)
2. Ejecuta en Supabase:
   ```sql
   SELECT * FROM profiles WHERE referral_code = 'CODIGO_INGRESADO';
   ```
3. Si no existe, el código es inválido

---

### Problema: Error "policy violation"

**Causa**: Las políticas RLS no están configuradas

**Solución**:
1. Ejecuta el script `importante/ACTUALIZACION_RLS.sql` en Supabase
2. Verifica las políticas:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

---

### Problema: "Perfil no se crea"

**Causa**: Error en la inserción o RLS

**Solución**:
1. Revisa la consola del navegador para ver el error específico
2. Si es error de RLS (42501), el sistema automáticamente intenta con RPC
3. Verifica que las funciones RPC existen:
   ```sql
   SELECT proname FROM pg_proc WHERE proname IN ('create_user_profile', 'create_user_wallet');
   ```

---

### Problema: "Wallet no se crea"

**Causa**: Trigger no está configurado o error de RLS

**Solución**:
1. El trigger debería crear la wallet automáticamente
2. Verifica:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trg_create_wallet_on_profile_insert';
   ```
3. Si no existe, ejecuta el script SQL nuevamente

---

## 📊 Consultas SQL Útiles para Depuración

### Verificar si un código de referido existe:
```sql
SELECT id, username, referral_code 
FROM profiles 
WHERE referral_code = 'ABC123';
```

### Ver todos los usuarios de un sponsor:
```sql
SELECT p.username, p.email, p.created_at
FROM profiles p
WHERE p.sponsor_id = 'uuid-del-sponsor'
ORDER BY p.created_at DESC;
```

### Ver árbol completo de un usuario:
```sql
-- Referidos hacia abajo (downline)
SELECT * FROM get_downline_referrals('uuid-del-usuario', 3);

-- Sponsors hacia arriba (upline)
SELECT * FROM get_upline_sponsors('uuid-del-usuario', 3);
```

### Ver relaciones en referrals:
```sql
SELECT 
    r.level,
    s.username AS sponsor,
    rft.username AS referido,
    r.created_at
FROM referrals r
JOIN profiles s ON r.sponsor_id = s.id
JOIN profiles rft ON r.referred_id = rft.id
ORDER BY r.level, r.created_at;
```

---

## 🎯 Resultado Esperado

Después de registrar 3 usuarios en cadena:

```
Usuario1 (referral: ABC123)
└── Usuario2 (referral: DEF456, sponsor: Usuario1)
    └── Usuario3 (referral: GHI789, sponsor: Usuario2)
```

En la tabla `referrals` deberías ver:

| sponsor | referido | nivel |
|---------|---------|-------|
| Usuario1 | Usuario2 | 1 |
| Usuario1 | Usuario3 | 2 |
| Usuario2 | Usuario3 | 1 |

---

**Fecha de creación**: 2026-03-11
**Versión**: 2.0
