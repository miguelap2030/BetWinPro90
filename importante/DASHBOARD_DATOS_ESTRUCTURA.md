# Dashboard BetWinPro90 - Datos y Estructura

## 📊 Funciones RPC Utilizadas

### 1. `get_user_dashboard_summary(p_user_id UUID)`

Devuelve un resumen completo del dashboard del usuario.

**Campos retornados:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `username` | TEXT | Nombre de usuario |
| `email` | TEXT | Correo electrónico |
| `referral_code` | TEXT | Código de referido del usuario |
| `sponsor_username` | TEXT | Username del sponsor |
| `joined_date` | TIMESTAMPTZ | Fecha de registro |
| `total_referrals` | INT | Total de referidos en la red |
| `level_1_count` | INT | Referidos de nivel 1 (directos) |
| `level_2_count` | INT | Referidos de nivel 2 |
| `level_3_count` | INT | Referidos de nivel 3 |
| `balance_disponible` | NUMERIC | Saldo disponible para usar |
| `balance_invertido` | NUMERIC | Saldo invertido (genera 3% diario) |
| `total_retirado` | NUMERIC | Total retirado históricamente |
| `total_comisiones` | NUMERIC | Total de comisiones ganadas |
| `total_earnings` | NUMERIC | Ganancias totales de MLM |

**Ejemplo de uso:**
```sql
SELECT * FROM get_user_dashboard_summary('USER_UUID');
```

### 2. `get_referrals_tree_recursive(p_user_id UUID)`

Devuelve todo el árbol de referidos de forma recursiva.

**Campos retornados:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `referred_id` | UUID | ID del referido |
| `username` | TEXT | Username del referido |
| `email` | TEXT | Email del referido |
| `level` | INT | Nivel en la red (1, 2, 3) |
| `joined_date` | TIMESTAMPTZ | Fecha de registro |

**Ejemplo de uso:**
```sql
SELECT * FROM get_referrals_tree_recursive('USER_UUID');
```

### 3. `get_user_transactions(p_user_id UUID, p_limit INT)`

Devuelve el historial de transacciones del usuario.

**Campos retornados:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID de la transacción |
| `user_id` | UUID | ID del usuario |
| `type` | TEXT | Tipo de transacción |
| `amount` | NUMERIC | Monto |
| `description` | TEXT | Descripción |
| `reference` | TEXT | Referencia |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Tipos de transacciones:**
- `deposit` - Depósito
- `withdrawal` - Retiro
- `profit` - Ganancia diaria (3%)
- `commission` - Comisión MLM
- `transfer_in` - Transferencia de entrada
- `transfer_out` - Transferencia de salida
- `bet_win` - Apuesta ganada
- `bet_loss` - Apuesta perdida
- `bonus` - Bono

## 📁 Tablas de la Base de Datos

### `profiles`
Información principal de los usuarios.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    sponsor_id UUID REFERENCES profiles(id),
    referral_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `wallets`
Balances y totales financieros.

```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
    balance_disponible NUMERIC(18, 2) DEFAULT 0,
    balance_invertido NUMERIC(18, 2) DEFAULT 0,
    total_retirado NUMERIC(18, 2) DEFAULT 0,
    total_comisiones NUMERIC(18, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `referrals`
Red de referidos por niveles.

```sql
CREATE TABLE referrals (
    id UUID PRIMARY KEY,
    sponsor_id UUID NOT NULL REFERENCES profiles(id),
    referred_id UUID NOT NULL REFERENCES profiles(id),
    level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sponsor_id, referred_id)
);
```

### `mlm_commissions`
Comisiones MLM distribuidas.

```sql
CREATE TABLE mlm_commissions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    from_user_id UUID NOT NULL REFERENCES profiles(id),
    level INT NOT NULL,
    type TEXT DEFAULT 'deposit',
    amount NUMERIC(18, 8) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    related_deposit_id UUID REFERENCES deposits(id),
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `transactions`
Historial completo de transacciones.

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    type TEXT NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    description TEXT,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `deposits`
Depósitos de los usuarios.

```sql
CREATE TABLE deposits (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    amount NUMERIC(18, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 Sistema MLM

### Porcentajes por Nivel
| Nivel | Porcentaje | Descripción |
|-------|------------|-------------|
| 1 | 5% | Referidos directos |
| 2 | 3% | Referidos de nivel 1 |
| 3 | 1% | Referidos de nivel 2 |

### Ejemplo de Distribución
Si un usuario en **nivel 3** deposita **$100**:
- **Nivel 1** (padre directo): $5.00 (5%)
- **Nivel 2** (abuelo): $3.00 (3%)
- **Nivel 3** (bisabuelo): $1.00 (1%)

**Total distribuido:** $9.00

## 🔧 Componentes del Dashboard

### `Panel.jsx`
Muestra el resumen financiero:
- Balance disponible
- Balance invertido
- Total retirado
- Total comisiones
- Red de referidos por niveles

### `Equipo.jsx`
Muestra la red de referidos:
- Lista completa de referidos
- Filtrado por niveles
- Link de referido para compartir

### `Transacciones.jsx`
Historial de movimientos:
- Todas las transacciones
- Filtros por tipo
- Búsqueda por descripción

### `Cuenta.jsx`
Configuración del perfil:
- Datos del usuario
- Código de referido
- Cambio de contraseña

## 📝 Consultas Útiles

### Ver todos los usuarios con balances
```sql
SELECT 
    p.username,
    p.email,
    w.balance_disponible,
    w.balance_invertido,
    w.total_comisiones,
    p.referral_count
FROM profiles p
JOIN wallets w ON p.id = w.user_id
ORDER BY w.total_comisiones DESC;
```

### Ver comisiones por usuario
```sql
SELECT 
    p.username,
    COUNT(mc.id) as cantidad_comisiones,
    SUM(mc.amount) as monto_total
FROM profiles p
LEFT JOIN mlm_commissions mc ON p.id = mc.user_id
WHERE mc.is_paid = true
GROUP BY p.id, p.username
ORDER BY monto_total DESC;
```

### Ver red de referidos de un usuario
```sql
SELECT 
    r.level,
    p.username,
    p.email,
    p.created_at
FROM referrals r
JOIN profiles p ON r.referred_id = p.id
WHERE r.sponsor_id = 'USER_UUID'
ORDER BY r.level, p.created_at;
```

## 🚀 Trigger de Depósitos

El trigger `trg_deposit_completed` se ejecuta automáticamente cuando:
- Se inserta un depósito con `status = 'completed'`
- O se actualiza un depósito a `status = 'completed'`

**Acciones del trigger:**
1. Actualiza `balance_invertido` del usuario que depositó
2. Distribuye comisiones MLM a los sponsors (5%, 3%, 1%)
3. Inserta registros en `mlm_commissions`
4. Inserta registros en `transactions` con `type = 'commission'`
5. Actualiza `balance_disponible` y `total_comisiones` de los sponsors

---

**Última actualización:** 2024
**Versión:** 1.0.0
