# Configuración de Administrador - BetWinPro90

## Resumen de Cambios

Se ha implementado el sistema de roles para administradores con las siguientes características:

### 1. Variables de Entorno Actualizadas

Se agregó la `SUPABASE_SERVICE_ROLE_KEY` al archivo `.env`:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Importante**: Esta clave permite acceso total a la base de datos. Nunca compartirla ni subirla a repositorios públicos.

### 2. Cliente Supabase con Service Role

Se creó `supabaseAdmin` en `src/lib/supabaseClient.js`:
- Cliente normal (`supabase`): Respeta las políticas RLS
- Cliente admin (`supabaseAdmin`): Ignora RLS, solo para operaciones administrativas

### 3. Redirección por Roles en Login

El componente `SignIn` ahora:
- Verifica el rol del usuario después del login
- Redirige admins a `/admin/dashboard`
- Redirige usuarios normales a `/dashboard`

### 4. Protección de Rutas Admin

El componente `AdminRoute`:
- Verifica si el usuario tiene rol `admin` en la tabla `profiles`
- Muestra error si hay problemas de permisos
- Redirige al dashboard normal si no es admin

### 5. Rutas Admin Configuradas

```jsx
/admin/dashboard  → Panel de administración
/admin/*          → Redirige a /admin/dashboard
```

---

## Configuración en la Base de Datos

### Paso 1: Ejecutar Script SQL

Ejecuta el archivo `importante/sql/ADMIN_ROLE_VERIFICATION.sql` en el SQL Editor de Supabase.

Este script:
- Agrega la columna `role` a `profiles` (si no existe)
- Crea/actualiza todas las funciones RPC necesarias
- Configura las políticas RLS para admins
- Concede permisos de ejecución

### Paso 2: Crear Usuario Admin

**Opción A: Usando el script SQL**

Ejecuta `importante/sql/crear_admin.sql` que crea:
- Email: `admin2313@gmail.com`
- Password: `123456`
- Rol: `admin`

**Opción B: Manualmente**

1. Registra un usuario desde `/signup`
2. Ejecuta en SQL Editor:

```sql
-- Reemplaza con el email del usuario
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'tu-email@admin.com';
```

**Opción C: Desde Supabase Dashboard**

1. Ve a Authentication > Users
2. Crea un nuevo usuario
3. Luego en SQL Editor ejecuta el UPDATE anterior

### Paso 3: Verificar Configuración

Ejecuta estas consultas para verificar:

```sql
-- 1. Verificar que las funciones existen
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'is_user_admin%';

-- 2. Ver usuarios admin
SELECT id, username, email, role, is_active 
FROM profiles 
WHERE role = 'admin';

-- 3. Probar función (después de loguearte como admin)
SELECT is_user_admin();
-- Debe retornar: true
```

---

## Uso del Dashboard Admin

### Acceder

1. Inicia sesión con una cuenta admin en `/signin`
2. Serás redirigido automáticamente a `/admin/dashboard`

### Funcionalidades

#### Dashboard Principal
- Total de usuarios (activos/inactivos)
- Total invertido, disponible, retirado
- Comisiones MLM distribuidas
- Retiros y depósitos pendientes

#### Gestión de Usuarios
- Buscar usuarios por username/email
- Filtrar por estado (activo/inactivo)
- Cambiar rol (usuario/moderador/admin)
- Activar/desactivar usuarios
- Ver balances de cada usuario

#### Aprobar Retiros
- Lista de retiros pendientes
- Ver información de pago
- Aprobar o rechazar con notas
- Actualización automática de balances

#### Aprobar Depósitos
- Lista de depósitos pendientes
- Ver hash de transacción
- Aprobar o rechazar con notas
- Distribución automática de comisiones MLM

---

## Estructura de la Base de Datos

### Tabla `profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | Primary key |
| username | text | Nombre de usuario |
| email | text | Email único |
| **role** | text | `'user'`, `'moderator'`, `'admin'` |
| is_active | boolean | Estado del usuario |
| sponsor_id | uuid | ID del sponsor (MLM) |
| referral_code | text | Código de referido único |

### Funciones RPC para Admin

| Función | Propósito |
|---------|-----------|
| `is_user_admin()` | Verifica si el usuario actual es admin |
| `get_admin_dashboard_stats()` | Estadísticas generales |
| `get_all_users_paginated()` | Lista usuarios con paginación |
| `get_withdrawals_pending()` | Obtiene retiros pendientes |
| `get_deposits_pending()` | Obtiene depósitos pendientes |
| `admin_process_withdrawal()` | Aprueba/rechaza retiro |
| `admin_process_deposit()` | Aprueba/rechaza depósito |
| `admin_update_user_role()` | Cambia rol de usuario |
| `admin_toggle_user_active()` | Activa/desactiva usuario |

---

## Flujo de Funcionamiento

### Login de Admin

```
1. Usuario ingresa credenciales en /signin
   ↓
2. Supabase Auth autentica
   ↓
3. Se consulta profiles.role
   ↓
4. Si role = 'admin' → /admin/dashboard
   Si role = 'user' → /dashboard
```

### Protección de Ruta Admin

```
1. Intenta acceder a /admin/*
   ↓
2. AdminRoute verifica sesión
   ↓
3. Ejecuta is_user_admin() RPC
   ↓
4. Si true → Muestra dashboard admin
   Si false → Redirige a /dashboard/principal
```

### Aprobación de Retiro

```
1. Admin hace clic en "Aprobar Retiro"
   ↓
2. Llama a admin_process_withdrawal()
   ↓
3. La función:
   - Verifica saldo del usuario
   - Actualiza withdrawal.status = 'approved'
   - Resta de wallets.balance_disponible
   - Suma a wallets.total_retirado
   - Crea transacción
   ↓
4. Se actualiza la UI
```

---

## Solución de Problemas

### Error: "No tienes permisos"

**Causa**: El usuario no tiene rol `admin`

**Solución**:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

### Error: "Función is_user_admin no existe"

**Causa**: Falta ejecutar el script SQL

**Solución**: Ejecutar `ADMIN_ROLE_VERIFICATION.sql` en Supabase SQL Editor

### El login no redirige a admin

**Causa**: La columna `role` no existe o es NULL

**Solución**:
```sql
-- Verificar columna
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Si no existe, ejecutar el script SQL

-- Si existe pero es NULL
UPDATE profiles SET role = 'user' WHERE role IS NULL;
```

### Las funciones RPC fallan

**Causa**: Políticas RLS muy restrictivas

**Solución**: Verificar que las funciones tengan `SECURITY DEFINER`:
```sql
SELECT routine_name, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public';
```

---

## Seguridad

### Buenas Prácticas

1. **Nunca exponer Service Role Key en el frontend**
   - El cliente `supabaseAdmin` solo debe usarse en backend o edge functions
   - Para el frontend, usar siempre el cliente normal con RLS

2. **Múltiples admins**
   - Crear máximo 2-3 usuarios admin
   - Usar rol `moderator` para permisos limitados

3. **Auditoría**
   - Todas las acciones admin quedan registradas en `notes`
   - Revisar periódicamente los logs de transacciones

### Políticas RLS Actuales

```sql
-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (role = 'admin');

-- Solo admins pueden actualizar roles
CREATE POLICY "Admins pueden actualizar roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (role = 'admin');
```

---

## Referencias

- **SQL Scripts**: `/importante/sql/`
  - `ADMIN_ROLE_VERIFICATION.sql` - Configuración completa
  - `crear_admin.sql` - Crear usuario admin por defecto
  - `ADMIN_DASHBOARD_SETUP.sql` - Script original

- **Componentes**:
  - `src/components/AdminRoute.jsx` - Protección de rutas
  - `src/components/SignIn.jsx` - Login con redirección por rol
  - `src/pages/admin/` - Dashboard y componentes admin

- **Hooks**:
  - `src/hooks/useAdminRole.js` - Hooks para verificar rol y estadísticas

---

## Comandos Útiles

```sql
-- Ver todos los admins
SELECT * FROM profiles WHERE role = 'admin';

-- Contar usuarios por rol
SELECT role, COUNT(*) FROM profiles GROUP BY role;

-- Verificar función is_user_admin
SELECT is_user_admin(); -- Ejecutar logueado como admin

-- Probar estadísticas
SELECT * FROM get_admin_dashboard_stats();

-- Listar funciones RPC
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```
