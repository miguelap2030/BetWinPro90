# 📊 BetWinPro90 - Documentación Completa de Base de Datos

**Proyecto Supabase:** `alyboipgbixoufqftizd`  
**Última actualización:** 17 de Marzo, 2026  
**Total de usuarios:** 13 perfiles registrados

---

## 📋 Índice

1. [Tablas de la Base de Datos](#tablas-de-la-base-de-datos)
2. [Funciones RPC](#funciones-rpc)
3. [Triggers](#triggers)
4. [Políticas RLS (Row Level Security)](#políticas-rls)
5. [Vistas y Vistas Materializadas](#vistas-y-vistas-materializadas)
6. [Índices](#índices)
7. [Relaciones entre Tablas](#relaciones-entre-tablas)

---

## 🗄️ Tablas de la Base de Datos

### 1. `profiles` - Perfiles de Usuario

**Propósito:** Almacena la información pública de los usuarios del sistema.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | - | PK. Referencia a `auth.users.id` |
| `username` | text | NO | - | Nombre de usuario único |
| `email` | text | NO | - | Email único del usuario |
| `referral_code` | text | NO | - | Código de referido único (8 caracteres) |
| `sponsor_id` | uuid | SI | - | FK al sponsor (referidor directo) |
| `referral_count` | integer | SI | 0 | Cantidad de referidos directos |
| `created_at` | timestamptz | SI | now() | Fecha de creación |
| `updated_at` | timestamptz | SI | now() | Fecha de última actualización |
| `is_active` | boolean | SI | false | Estado del usuario (activo/inactivo) |
| `role` | text | SI | 'user' | Rol: 'user' o 'admin' |

**Índices:**
- `profiles_pkey` - PRIMARY KEY (id)
- `profiles_username_key` - UNIQUE (username)
- `profiles_email_key` - UNIQUE (email)
- `profiles_referral_code_key` - UNIQUE (referral_code)
- `idx_profiles_sponsor` - (sponsor_id) - Para consultas MLM
- `idx_profiles_role` - (role) - Para filtrar admins
- `idx_profiles_is_active` - Parcial WHERE is_active = true

**Constraints:**
- FK: `id` → `auth.users(id)` ON DELETE CASCADE
- FK: `sponsor_id` → `profiles(id)` (autoreferencia)

**Triggers:**
- `update_profiles_updated_at` - Actualiza `updated_at` antes de UPDATE

---

### 2. `wallets` - Billeteras de Usuario

**Propósito:** Gestiona los saldos y balances de cada usuario.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK único a profiles |
| `balance_disponible` | numeric(18,2) | SI | 0 | Saldo disponible para operar |
| `balance_invertido` | numeric(18,2) | SI | 0 | Saldo invertido generando profit |
| `total_retirado` | numeric(18,2) | SI | 0 | Acumulado histórico de retiros |
| `total_comisiones` | numeric(18,2) | SI | 0 | Acumulado histórico de comisiones MLM |
| `created_at` | timestamptz | SI | now() | Fecha de creación |
| `updated_at` | timestamptz | SI | now() | Fecha de última actualización |
| `profit_daily` | numeric(15,2) | SI | 0 | **Histórico de ganancias diarias (3%)** |

**Índices:**
- `wallets_pkey` - PRIMARY KEY (id)
- `wallets_user_id_key` - UNIQUE (user_id)
- `idx_wallets_user` - (user_id)

**Constraints:**
- FK: `user_id` → `profiles(id)` ON DELETE CASCADE

**Triggers:**
- `update_wallets_updated_at` - Actualiza `updated_at` antes de UPDATE
- `trg_update_is_active` - AFTER INSERT/UPDATE de `balance_invertido` → actualiza `profiles.is_active`

---

### 3. `deposits` - Depósitos

**Propósito:** Registra los depósitos de dinero de los usuarios.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK a profiles |
| `amount` | numeric | NO | - | Monto del depósito |
| `currency` | text | SI | 'USD' | Moneda (default: USD) |
| `status` | text | SI | 'pending' | Estado: pending, completed, rejected |
| `payment_method` | text | SI | - | Método de pago |
| `transaction_hash` | text | SI | - | Hash de transacción (crypto) |
| `completed_at` | timestamptz | SI | - | Fecha de completado |
| `created_at` | timestamptz | SI | now() | Fecha de creación |
| `updated_at` | timestamptz | SI | now() | Fecha de actualización |

**Triggers:**
- `update_deposits_updated_at` - Actualiza `updated_at`
- `trg_deposit_completed` - AFTER INSERT/UPDATE → si status='completed', distribuye comisiones MLM

---

### 4. `withdrawals` - Retiros

**Propósito:** Gestiona las solicitudes de retiro de los usuarios.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK a profiles |
| `amount` | numeric | NO | - | Monto del retiro |
| `status` | text | SI | 'pending' | Estado: pending, approved, rejected |
| `wallet_address` | text | SI | - | Dirección de wallet para pago |
| `processed_at` | timestamptz | SI | - | Fecha de procesamiento |
| `rejected_at` | timestamptz | SI | - | Fecha de rechazo |
| `rejection_reason` | text | SI | - | Motivo del rechazo |
| `created_at` | timestamptz | SI | now() | Fecha de creación |
| `updated_at` | timestamptz | SI | now() | Fecha de actualización |

**Triggers:**
- `update_withdrawals_updated_at` - Actualiza `updated_at`

---

### 5. `mlm_commissions` - Comisiones MLM

**Propósito:** Registro detallado de comisiones del sistema multinivel.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK: usuario que recibe la comisión |
| `from_user_id` | uuid | NO | - | FK: usuario que generó la comisión |
| `level` | integer | NO | - | Nivel MLM (1, 2, 3) |
| `type` | text | SI | 'deposit' | Tipo: deposit, profit |
| `amount` | numeric | NO | - | Monto de la comisión |
| `percentage` | numeric | NO | - | Porcentaje aplicado (5%, 3%, 1%) |
| `related_deposit_id` | uuid | SI | - | FK al depósito relacionado |
| `is_paid` | boolean | SI | false | Estado de pago |
| `paid_at` | timestamptz | SI | - | Fecha de pago |
| `created_at` | timestamptz | SI | now() | Fecha de creación |

**Constraints:**
- FK: `user_id` → `profiles(id)` ON DELETE CASCADE
- FK: `from_user_id` → `profiles(id)` ON DELETE CASCADE

---

### 6. `transactions` - Transacciones

**Propósito:** Historial general de todas las transacciones del sistema.

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK a profiles |
| `type` | text | NO | - | Tipo: deposit, withdrawal, profit, commission, transfer |
| `amount` | numeric | NO | - | Monto de la transacción |
| `description` | text | SI | - | Descripción detallada |
| `reference` | text | SI | - | Referencia externa (hash, ID) |
| `created_at` | timestamptz | SI | now() | Fecha de creación |

**Constraints:**
- FK: `user_id` → `profiles(id)` ON DELETE CASCADE

---

### 7. `transfers_internas` - Transferencias Internas

**Propósito:** Registro de transferencias entre wallets (disponible ↔ invertido).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `user_id` | uuid | NO | - | FK a profiles |
| `amount` | numeric | NO | - | Monto transferido |
| `type` | text | NO | - | Tipo: to_invested, from_invested |
| `from_wallet` | text | NO | - | Wallet origen: disponible, invertido |
| `to_wallet` | text | NO | - | Wallet destino: disponible, invertido |
| `description` | text | SI | - | Descripción |
| `created_at` | timestamptz | SI | now() | Fecha de creación |

**Constraints:**
- FK: `user_id` → `profiles(id)` ON DELETE CASCADE

---

### 8. `referrals` - Referidos Directos

**Propósito:** Tabla auxiliar para relaciones de referido (opcional, se usa `sponsor_id` en profiles).

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | PK |
| `sponsor_id` | uuid | NO | - | FK: usuario sponsor |
| `referred_id` | uuid | NO | - | FK: usuario referido |
| `level` | integer | SI | 1 | Nivel de relación |
| `created_at` | timestamptz | SI | now() | Fecha de creación |

**Constraints:**
- FK: `sponsor_id` → `profiles(id)` ON DELETE CASCADE
- FK: `referred_id` → `profiles(id)` ON DELETE CASCADE

---

### 9. Vistas de Resumen (Views)

#### `user_summary`
Resumen de usuario con datos combinados de profiles, wallets y comisiones.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id`, `username`, `email`, `referral_code` | - | Datos del perfil |
| `sponsor_username` | text | Nombre del sponsor |
| `referral_count` | integer | Cantidad de referidos |
| `balance_disponible`, `balance_invertido` | numeric | Balances |
| `total_comisiones` | numeric | Total comisiones |
| `created_at` | timestamptz | Fecha creación |

#### `user_profit_summary`
Resumen de profit y ganancias por usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `user_id`, `username`, `email` | - | Datos del usuario |
| `balance_invertido` | numeric | Saldo invertido |
| `profit_daily` | numeric | Ganancia diaria acumulada |
| `balance_disponible` | numeric | Saldo disponible |
| `is_active` | boolean | Estado |
| `expected_daily_profit` | numeric | 3% de balance_invertido |

#### `commission_summary`
Resumen de comisiones por usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `username` | text | Nombre de usuario |
| `total_comisiones` | bigint | Cantidad de comisiones |
| `monto_total`, `monto_pagado` | numeric | Montos acumulados |

---

## ⚙️ Funciones RPC

### Funciones de Administración

#### `admin_process_deposit(p_deposit_id uuid, p_status text, p_admin_notes text)`
**Propósito:** Un administrador procesa un depósito pendiente.  
**Security:** DEFINER  
**Retorna:** TABLE(success boolean, message text)

#### `admin_process_withdrawal(p_withdrawal_id uuid, p_status text, p_admin_notes text)`
**Propósito:** Un administrador aprueba/rechaza un retiro.  
**Security:** DEFINER  
**Retorna:** TABLE(success boolean, message text)

#### `admin_update_user_role(p_user_id uuid, p_role text)`
**Propósito:** Cambiar el rol de un usuario (user ↔ admin).  
**Security:** DEFINER  
**Retorna:** TABLE(success boolean, message text)

#### `admin_toggle_user_active(p_user_id uuid, p_is_active boolean)`
**Propósito:** Activar/desactivar un usuario.  
**Security:** DEFINER  
**Retorna:** TABLE(success boolean, message text)

---

### Funciones de Creación de Usuario

#### `create_user_profile(p_user_id uuid, p_username text, p_email text, p_sponsor_id uuid, p_referral_code text)`
**Propósito:** Crea un perfil después del registro en Auth.  
**Security:** DEFINER  
**Retorna:** uuid (el ID del perfil creado)

**Proceso:**
1. Genera `referral_code` único (8 caracteres aleatorios)
2. Inserta en `profiles`
3. Llama a `create_user_wallet()`
4. Si tiene `sponsor_id`, actualiza `referral_count` del sponsor

#### `create_user_wallet(p_user_id uuid)`
**Propósito:** Crea una wallet para un usuario.  
**Security:** DEFINER  
**Retorna:** uuid (el ID de la wallet)

#### `create_wallet_on_profile_insert()`
**Propósito:** Trigger function que crea wallet automáticamente al insertar profile.  
**Security:** INVOKER  
**Retorna:** trigger

---

### Funciones del Sistema MLM

#### `validate_referral_code(p_referral_code text)`
**Propósito:** Valida si un código de referido existe y retorna info del sponsor.  
**Security:** DEFINER (bypass RLS)  
**Retorna:** TABLE(id uuid, username text, referral_code text)

**Uso:**
```sql
SELECT * FROM validate_referral_code('A1B2C3D4');
```

#### `get_referrals_tree_recursive(p_user_id uuid)`
**Propósito:** Obtiene TODO el árbol de referidos (hasta nivel 3) usando CTE recursivo.  
**Security:** DEFINER  
**Retorna:** TABLE(referred_id uuid, username text, email text, level integer, joined_date timestamptz)

#### `get_referrals_by_level_recursive(p_user_id uuid, p_level integer DEFAULT 1)`
**Propósito:** Obtiene referidos de un nivel específico.  
**Security:** DEFINER  
**Retorna:** TABLE con datos completos del referido + sponsor info

#### `get_referral_counts_recursive(p_user_id uuid)`
**Propósito:** Cuenta referidos por nivel.  
**Security:** DEFINER  
**Retorna:** TABLE(total_referrals, level_1_count, level_2_count, level_3_count)

#### `get_user_upline_recursive(p_user_id uuid)`
**Propósito:** Obtiene la ascendencia completa (sponsors hacia arriba).  
**Security:** DEFINER  
**Retorna:** TABLE(sponsor_id, username, email, referral_code, level)

#### `get_upline_sponsors(p_user_id uuid, p_max_level integer DEFAULT 3)`
**Propósito:** Obtiene los sponsors hasta nivel 3 hacia arriba.  
**Security:** DEFINER  
**Retorna:** TABLE(sponsor_id, username, level)

#### `update_referral_count(p_sponsor_id uuid)`
**Propósito:** Actualiza el contador de referidos de un sponsor.  
**Security:** INVOKER  
**Retorna:** void

---

### Funciones de Comisiones

#### `distribute_deposit_commissions(p_deposit_id uuid)`
**Propósito:** Distribuye comisiones MLM cuando un depósito se completa.  
**Security:** DEFINER  
**Retorna:** TABLE(level integer, sponsor_username text, commission_amount numeric, success boolean)

**Lógica:**
- Nivel 1: 5% del depósito
- Nivel 2: 3% del depósito
- Nivel 3: 1% del depósito

#### `calculate_deposit_commissions(p_deposit_id uuid)`
**Propósito:** Calcula comisiones sin distribuirlas.  
**Security:** INVOKER  
**Retorna:** void

#### `get_commissions_by_user(p_user_id uuid)`
**Propósito:** Obtiene historial de comisiones de un usuario.  
**Security:** DEFINER  
**Retorna:** TABLE(commission_id, from_username, level, type, amount, percentage, created_at)

#### `get_commissions_by_level(p_user_id uuid)`
**Propósito:** Agrupa comisiones por nivel.  
**Security:** DEFINER  
**Retorna:** TABLE(level, total_amount, commission_count)

---

### Funciones de Profit Diario

#### `distribute_daily_profit()`
**Propósito:** Distribuye el 3% diario sobre el saldo invertido de TODOS los usuarios.  
**Security:** DEFINER  
**Retorna:** void

**Uso con pg_cron:**
```sql
SELECT cron.schedule('daily-profit', '0 0 * * *', 'SELECT distribute_daily_profit()');
```

**Lógica:**
1. Recorre todas las wallets con `balance_invertido > 0`
2. Calcula 3% del balance
3. Suma a `balance_disponible` y `profit_daily`
4. Crea transacción tipo 'profit'

#### `distribute_daily_earnings(p_date date DEFAULT CURRENT_DATE)`
**Propósito:** Versión alternativa de distribución de profit.  
**Security:** INVOKER  
**Retorna:** integer (cantidad de usuarios beneficiados)

---

### Funciones de Dashboard y Reportes

#### `get_user_dashboard_summary(p_user_id uuid)`
**Propósito:** Obtiene TODA la información del dashboard de un usuario.  
**Security:** INVOKER  
**Retorna:** TABLE con:
- username, email, referral_code, sponsor_username
- total_referrals, level_1_count, level_2_count, level_3_count
- balance_disponible, balance_invertido, total_retirado, total_comisiones
- total_earnings, profit_daily, expected_daily_profit

#### `get_admin_dashboard_stats()`
**Propósito:** Estadísticas globales para el panel de administrador.  
**Security:** DEFINER  
**Retorna:** TABLE(total_usuarios, usuarios_activos, usuarios_inactivos, total_invertido, total_disponible, total_retirado, total_comisiones, total_depositos, total_retiros, retiros_pendientes, deposits_pendientes, profit_distribuido)

#### `get_all_active_wallets()`
**Propósito:** Lista todas las wallets activas (con balance_invertido > 0).  
**Security:** DEFINER  
**Retorna:** TABLE(user_id, username, email, is_active, balance_invertido, balance_disponible, profit_daily)

#### `get_all_users_paginated(p_limit, p_offset, p_search, p_filter_active)`
**Propósito:** Paginación de usuarios para admin.  
**Security:** DEFINER  
**Retorna:** TABLE con datos completos + total_count para paginación

---

### Funciones de Transacciones

#### `get_user_transactions(p_user_id uuid, p_limit integer DEFAULT 100)`
**Propósito:** Obtiene historial de transacciones de un usuario.  
**Security:** DEFINER  
**Retorna:** TABLE(id, user_id, type, amount, description, reference, created_at)

#### `get_recent_profit_transactions(p_limit integer DEFAULT 10)`
**Propósito:** Últimas transacciones de profit.  
**Security:** DEFINER  
**Retorna:** TABLE(transaction_id, user_id, username, amount, description, created_at)

---

### Funciones de Utilidad

#### `is_user_admin()`
**Propósito:** Verifica si el usuario actual es admin.  
**Security:** DEFINER  
**Retorna:** boolean

**Uso:**
```sql
SELECT is_user_admin(); -- true o false
```

#### `update_user_profile(p_user_id uuid, p_username, p_wallet_address)`
**Propósito:** Actualiza datos del perfil.  
**Security:** DEFINER  
**Retorna:** boolean (éxito)

#### `update_updated_at_column()`
**Propósito:** Trigger function para actualizar `updated_at`.  
**Security:** INVOKER  
**Retorna:** trigger

#### `update_is_active()`
**Propósito:** Trigger function que actualiza `profiles.is_active` según `wallets.balance_invertido`.  
**Security:** INVOKER  
**Retorna:** trigger

**Lógica:**
- Si `balance_invertido > 0` → `is_active = true`
- Si `balance_invertido = 0` → `is_active = false`

#### `set_completed_at()`
**Propósito:** Trigger function para setear `completed_at` en deposits.  
**Security:** INVOKER  
**Retorna:** trigger

#### `trigger_deposit_completed()`
**Propósito:** Trigger function que distribuye comisiones cuando deposit status = 'completed'.  
**Security:** INVOKER  
**Retorna:** trigger

#### `trigger_update_total_comisiones()`
**Propósito:** Trigger function que actualiza `wallets.total_comisiones`.  
**Security:** INVOKER  
**Retorna:** trigger

#### `trigger_update_total_retirado()`
**Propósito:** Trigger function que actualiza `wallets.total_retirado`.  
**Security:** INVOKER  
**Retorna:** trigger

#### `refresh_materialized_views()`
**Propósito:** Refresca vistas materializadas (si existen).  
**Security:** DEFINER  
**Retorna:** void

---

### Funciones de Test y Diagnóstico

#### `test_referral_system(p_user_id uuid)`
**Propósito:** Testea el sistema de referidos.  
**Security:** DEFINER  
**Retorna:** TABLE(test_name, result, details jsonb)

#### `test_referral_tree(p_user_id uuid)`
**Propósito:** Testea el árbol de referidos.  
**Security:** DEFINER  
**Retorna:** TABLE(test_name, result, details jsonb)

#### `diagnose_referral_tree(p_user_id uuid)`
**Propósito:** Diagnóstico completo del árbol de referidos.  
**Security:** DEFINER  
**Retorna:** TABLE(check_name, status, message, details jsonb)

---

## 🔔 Triggers

### Triggers de Auditoría (updated_at)

| Trigger | Tabla | Timing | Evento | Función |
|---------|-------|--------|--------|---------|
| `update_profiles_updated_at` | profiles | BEFORE | UPDATE | `update_updated_at_column()` |
| `update_wallets_updated_at` | wallets | BEFORE | UPDATE | `update_updated_at_column()` |
| `update_deposits_updated_at` | deposits | BEFORE | UPDATE | `update_updated_at_column()` |
| `update_withdrawals_updated_at` | withdrawals | BEFORE | UPDATE | `update_updated_at_column()` |

### Triggers de Negocio

| Trigger | Tabla | Timing | Evento | Función |
|---------|-------|--------|--------|---------|
| `trg_deposit_completed` | deposits | AFTER | INSERT/UPDATE | `trigger_deposit_completed()` |
| `trg_update_is_active` | wallets | AFTER | INSERT/UPDATE OF balance_invertido | `update_is_active()` |

---

## 🔐 Políticas RLS (Row Level Security)

### Tabla: `profiles`

| Política | Operación | Roles | Condición (qual) |
|----------|-----------|-------|------------------|
| `profiles_select_policy` | SELECT | authenticated | `true` (todos pueden ver todos) |
| `Usuarios pueden actualizar su propio perfil` | UPDATE | authenticated | `auth.uid() = id` |
| `Admins pueden actualizar roles` | UPDATE | authenticated | EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') |

### Tabla: `wallets`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Wallets visibles para autenticados` | SELECT | authenticated | `true` |
| `Wallets inserts para autenticados` | INSERT | authenticated | `true` |
| `Wallets actualizables por el dueño` | UPDATE | authenticated | `auth.uid() = user_id` |

### Tabla: `deposits`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Usuarios pueden ver sus propios depósitos` | SELECT | public | `auth.uid() = user_id` |
| `Usuarios pueden crear sus propios depósitos` | INSERT | public | `auth.uid() = user_id` (WITH CHECK) |

### Tabla: `withdrawals`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Usuarios pueden ver sus propios retiros` | SELECT | public | `auth.uid() = user_id` |
| `Usuarios pueden crear sus propios retiros` | INSERT | public | `auth.uid() = user_id` (WITH CHECK) |

### Tabla: `mlm_commissions`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Usuarios pueden ver sus propias comisiones` | SELECT | public | `auth.uid() = user_id` |

### Tabla: `transactions`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Usuarios pueden ver sus propias transacciones` | SELECT | public | `auth.uid() = user_id` |

### Tabla: `referrals`

| Política | Operación | Roles | Condición |
|----------|-----------|-------|-----------|
| `Usuarios pueden ver sus propios referidos` | SELECT | public | `auth.uid() = sponsor_id` |

---

## 🔗 Relaciones entre Tablas

```
auth.users (1) ──┬── (1) profiles (1) ──┬── (1) wallets (1)
                 │                      │
                 │                      ├── (M) deposits
                 │                      │
                 │                      ├── (M) withdrawals
                 │                      │
                 │                      ├── (M) transactions
                 │                      │
                 │                      └── (M) referrals (sponsor_id)
                 │
                 └── (M) referrals (referred_id)

profiles (sponsor_id) ──┬── (M) profiles (autoreferencia)
                        │
                        └── (M) mlm_commissions (user_id y from_user_id)

deposits (1) ── (M) mlm_commissions (related_deposit_id)
```

---

## 📈 Flujo del Sistema MLM

### 1. Registro de Usuario

```
1. Usuario se registra en /signup
   ↓
2. Supabase Auth crea usuario en auth.users
   ↓
3. Se llama a create_user_profile()
   ↓
4. Genera referral_code único (8 caracteres)
   ↓
5. Inserta en profiles con sponsor_id (si existe)
   ↓
6. Crea wallet con balance = 0
   ↓
7. Actualiza referral_count del sponsor
```

### 2. Depósito y Distribución de Comisiones

```
1. Usuario crea depósito (status = 'pending')
   ↓
2. Admin aprueba depósito (status = 'completed')
   ↓
3. Trigger trg_deposit_completed se ejecuta
   ↓
4. Llama a distribute_deposit_commissions()
   ↓
5. Busca sponsors hasta nivel 3 con CTE recursivo
   ↓
6. Distribuye:
   - Nivel 1: 5% → sponsor directo
   - Nivel 2: 3% → sponsor del sponsor
   - Nivel 3: 1% → tercer nivel
   ↓
7. Inserta en mlm_commissions
   ↓
8. Actualiza wallets.total_comisiones
   ↓
9. Crea transacciones tipo 'commission'
```

### 3. Profit Diario (3%)

```
00:00 UTC todos los días
   ↓
1. pg_cron ejecuta distribute_daily_profit()
   ↓
2. Recorre wallets con balance_invertido > 0
   ↓
3. Para cada wallet:
   - profit = balance_invertido * 0.03
   - balance_disponible += profit
   - profit_daily += profit
   ↓
4. Crea transacción tipo 'profit'
```

---

## 🛠️ Scripts SQL Útiles

### Verificar función RPC
```sql
SELECT * FROM validate_referral_code('CODIGO123');
```

### Ver árbol de referidos
```sql
SELECT * FROM get_referrals_tree_recursive('user-id-uuid');
```

### Ver estadísticas de admin
```sql
SELECT * FROM get_admin_dashboard_stats();
```

### Ver si usuario es admin
```sql
SELECT is_user_admin();
```

### Contar usuarios por nivel
```sql
SELECT * FROM get_referral_counts_recursive('user-id-uuid');
```

---

## 📝 Notas Importantes

1. **Security DEFINER vs INVOKER:**
   - `DEFINER`: Ejecuta con permisos del creador (bypass RLS)
   - `INVOKER`: Ejecuta con permisos del usuario que llama

2. **Funciones críticas con DEFINER:**
   - `validate_referral_code()` - Para evitar bloqueo por RLS
   - `distribute_daily_profit()` - Para acceder a todas las wallets
   - `get_admin_dashboard_stats()` - Para estadísticas globales

3. **Índices de rendimiento:**
   - `idx_profiles_referral_code` - Búsqueda rápida de códigos
   - `idx_profiles_sponsor` - Consultas MLM
   - `idx_wallets_user` - Acceso rápido a wallet

4. **Vistas de resumen:**
   - `user_summary` - Para listados rápidos
   - `user_profit_summary` - Para reportes de ganancias
   - `commission_summary` - Para totales de comisiones

---

**Documentación generada automáticamente desde la base de datos.**  
**Para actualizar:** Ejecutar scripts de consulta y regenerar este archivo.
