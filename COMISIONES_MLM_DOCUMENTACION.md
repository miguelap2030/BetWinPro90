# 💰 SISTEMA DE COMISIONES MLM - BETWINPRO90

## 📊 Resumen del Sistema

### Porcentajes de Comisión

| Nivel | Porcentaje | Descripción |
|-------|------------|-------------|
| **Nivel 1** | **5%** | Sponsor directo (quien lo invitó) |
| **Nivel 2** | **3%** | Sponsor del sponsor |
| **Nivel 3** | **1%** | Sponsor del sponsor del sponsor |

### Ejemplo Práctico

```
Usuario A (Raíz)
└── Usuario B (Nivel 1 de A)
    └── Usuario C (Nivel 2 de A, Nivel 1 de B)
        └── Usuario D (Nivel 3 de A, Nivel 2 de B, Nivel 1 de C)
```

**Cuando D deposita $100:**
- **Usuario C** (Nivel 1): Recibe **$5** (5% de $100)
- **Usuario B** (Nivel 2): Recibe **$3** (3% de $100)
- **Usuario A** (Nivel 3): Recibe **$1** (1% de $100)

**Total distribuido: $9**

---

## 🔧 Instalación

### 1. Ejecutar Script SQL

**URL:** Supabase Dashboard → SQL Editor

**Archivo:** `importante/SISTEMA_COMISIONES_MLM.sql`

Este script crea:
- ✅ Tabla `mlm_commissions`
- ✅ Función `get_upline_sponsors()` - Obtiene sponsors ascendentes
- ✅ Función `distribute_deposit_commissions()` - Distribuye comisiones
- ✅ Trigger `trg_deposit_completed` - Se ejecuta cuando depósito es completado
- ✅ Función `get_commissions_by_user()` - Ver comisiones de un usuario
- ✅ Vista `v_commission_summary` - Resumen de comisiones

---

## 🎯 Funcionamiento Automático

### Flujo cuando un usuario deposita:

```
1. Usuario realiza depósito
   ↓
2. Depósito cambia a estado 'completed'
   ↓
3. Trigger trg_deposit_completed se ejecuta
   ↓
4. Actualiza wallet del usuario (balance_invertido)
   ↓
5. Obtiene upline (sponsors hasta nivel 3)
   ↓
6. Calcula comisiones (5%, 3%, 1%)
   ↓
7. Inserta en mlm_commissions
   ↓
8. Actualiza wallets de sponsors (balance_disponible + total_comisiones)
   ↓
9. ✅ Comisiones distribuidas
```

### Manejo de Sponsors NULL

El sistema **automáticamente** maneja cuando no hay sponsor:

```sql
-- Si un usuario NO tiene sponsor:
SELECT sponsor_id FROM profiles WHERE id = 'USER_ID';
-- Resultado: NULL

-- El sistema se detiene automáticamente
-- No distribuye comisiones a niveles inexistentes
```

**Ejemplo:**
```
Usuario X (sin sponsor)
└── Usuario Y (Nivel 1 de X)
    └── Usuario Z (Nivel 2 de X, Nivel 1 de Y)
```

**Cuando Z deposita $100:**
- **Usuario Y** (Nivel 1): Recibe **$5** (5%)
- **Usuario X** (Nivel 2): Recibe **$3** (3%)
- **Nivel 3**: No existe → **$0**

**Total distribuido: $8** (en lugar de $9)

---

## 📁 Estructura de Datos

### Tabla `mlm_commissions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único de la comisión |
| `user_id` | UUID | Quien RECIBE la comisión |
| `from_user_id` | UUID | Quien GENERÓ la comisión (depositante) |
| `level` | SMALLINT | Nivel (1, 2, 3) |
| `type` | TEXT | Tipo (deposit, residual, bonus) |
| `amount` | NUMERIC | Monto de la comisión |
| `percentage` | NUMERIC | Porcentaje aplicado |
| `related_deposit_id` | UUID | Depósito relacionado |
| `is_paid` | BOOLEAN | Si ya fue pagada |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

### Tabla `wallets` (actualizada)

| Columna | Actualización |
|---------|---------------|
| `balance_disponible` | += comisión recibida |
| `total_comisiones` | += comisión recibida |

---

## 🔍 Consultas Útiles

### Ver comisiones de un usuario

```sql
SELECT * FROM get_commissions_by_user('USER_ID_AQUI');
```

### Ver resumen de comisiones

```sql
SELECT * FROM v_commission_summary 
ORDER BY total_earned DESC;
```

### Distribuir comisiones manualmente

```sql
SELECT * FROM distribute_deposit_commissions('DEPOSIT_ID_AQUI');
```

### Ver upline de un usuario

```sql
SELECT * FROM get_upline_sponsors('USER_ID_AQUI', 3);
```

---

## 🧪 Pruebas

### 1. Crear usuarios en cadena

```sql
-- Usuario A (raíz, sin sponsor)
INSERT INTO profiles (id, username, email, sponsor_id, referral_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'usuario_a', 'a@test.com', NULL, 'AAAA');

-- Usuario B (sponsor = A)
INSERT INTO profiles (id, username, email, sponsor_id, referral_code)
VALUES ('00000000-0000-0000-0000-000000000002', 'usuario_b', 'b@test.com', 
        '00000000-0000-0000-0000-000000000001', 'BBBB');

-- Usuario C (sponsor = B)
INSERT INTO profiles (id, username, email, sponsor_id, referral_code)
VALUES ('00000000-0000-0000-0000-000000000003', 'usuario_c', 'c@test.com',
        '00000000-0000-0000-0000-000000000002', 'CCCC');
```

### 2. Crear depósito completado

```sql
INSERT INTO deposits (id, user_id, amount, status, payment_method)
VALUES ('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000003',  -- Usuario C
        100.00,
        'completed',
        'simulado');
```

### 3. Verificar comisiones

```sql
-- Debería mostrar:
-- Usuario B: $5 (Nivel 1)
-- Usuario A: $3 (Nivel 2)
SELECT * FROM get_commissions_by_user('00000000-0000-0000-0000-000000000001');
SELECT * FROM get_commissions_by_user('00000000-0000-0000-0000-000000000002');
```

### 4. Ver wallets actualizadas

```sql
SELECT user_id, balance_disponible, total_comisiones
FROM wallets
WHERE user_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
);
```

---

## 🚨 Solución de Problemas

### Las comisiones no se distribuyen

**Verificar:**
1. El depósito tiene `status = 'completed'`
2. El trigger existe: `SELECT * FROM pg_trigger WHERE tgname = 'trg_deposit_completed';`
3. Los usuarios tienen `sponsor_id` configurado

### Error "function does not exist"

**Solución:** Ejecutar nuevamente el script SQL completo

### Comisiones duplicadas

**Solución:** El trigger ya verifica que el depósito no haya sido completado antes:
```sql
IF NEW.status = 'completed' 
   AND (OLD.status IS NULL OR OLD.status != 'completed')
```

---

## 📊 Resumen Final

| Característica | Estado |
|----------------|--------|
| Distribución automática | ✅ |
| 5% Nivel 1 | ✅ |
| 3% Nivel 2 | ✅ |
| 1% Nivel 3 | ✅ |
| Manejo de sponsor NULL | ✅ |
| Actualiza wallets | ✅ |
| Historial de comisiones | ✅ |
| Trigger automático | ✅ |

---

**¿Necesitas ajustar los porcentajes o agregar más niveles?**
Modifica la función `distribute_deposit_commissions()` y actualiza los casos CASE.
