# 🤖 Cron Job con pg_cron - BetWinPro90

## ✅ Implementación con pg_cron (RECOMENDADA)

Esta implementación usa **pg_cron**, la extensión nativa de PostgreSQL para cron jobs. Es **más simple, más confiable y no requiere scripts externos**.

---

## 📋 ¿Qué es pg_cron?

**pg_cron** es una extensión de PostgreSQL que permite ejecutar comandos SQL periódicamente dentro de la base de datos.

### Ventajas vs Script Externo

| Característica | pg_cron | Script Node.js |
|---------------|---------|----------------|
| Complejidad | ✅ Simple | ❌ Requiere servidor |
| Confiabilidad | ✅ Alta (en DB) | ⚠️ Depende del servidor |
| Mantenimiento | ✅ Mínimo | ❌ Requiere monitoreo |
| Costo | ✅ Gratis (incluido) | ⚠️ Requiere servidor 24/7 |
| Logs | ✅ En la DB | ❌ Archivos externos |

---

## 🚀 Instalación

### 1. Ejecutar Script SQL

```bash
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -f importante/sql/DAILY_PROFIT_PGCRON.sql
```

O desde el **SQL Editor de Supabase**, copiar y pegar el contenido del archivo.

### 2. Verificar Instalación

```sql
-- Ver cron jobs configurados
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Resultado esperado:
-- jobid | jobname                   | schedule  | active
-- ------+---------------------------+-----------+--------
-- 1     | daily-profit-distribution | 0 0 * * * | t
```

---

## ⏰ Configuración Actual

| Parámetro | Valor |
|-----------|-------|
| **Nombre** | `daily-profit-distribution` |
| **Horario** | `0 0 * * *` (todos los días a las 00:00 UTC) |
| **Comando** | `SELECT distribute_daily_profit()` |
| **Estado** | Activo |

### Zonas Horarias

El cron usa **UTC por defecto**. Para convertir a tu zona horaria:

| Zona | Hora Local | Cron Expression |
|------|-----------|-----------------|
| UTC | 00:00 | `0 0 * * *` |
| EST (UTC-5) | 19:00 | `0 5 * * *` |
| CST (UTC-6) | 18:00 | `0 6 * * *` |
| PST (UTC-8) | 16:00 | `0 8 * * *` |
| CET (UTC+1) | 01:00 | `0 23 * * *` |

---

## 🔍 Monitoreo

### Ver Estado del Cron Job

```sql
-- Ver jobs activos
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'daily-profit-distribution';
```

### Ver Historial de Ejecuciones

```sql
-- Últimas 10 ejecuciones
SELECT 
  jobid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;
```

### Ver Próxima Ejecución

pg_cron calcula automáticamente la próxima ejecución basada en el cron expression.

---

## 🛠️ Administración

### Pausar Cron Job

```sql
-- Pausar temporalmente
SELECT cron.alter_job(1, active := false);

-- Verificar
SELECT jobid, jobname, active FROM cron.job WHERE jobid = 1;
-- active = f (false)
```

### Reactivar Cron Job

```sql
-- Reactivar
SELECT cron.alter_job(1, active := true);

-- Verificar
SELECT jobid, jobname, active FROM cron.job WHERE jobid = 1;
-- active = t (true)
```

### Eliminar Cron Job

```sql
-- Eliminar job
SELECT cron.unschedule('daily-profit-distribution');

-- Verificar (debe estar vacío)
SELECT * FROM cron.job WHERE jobname = 'daily-profit-distribution';
```

### Recrear Cron Job

```sql
SELECT cron.schedule(
  'daily-profit-distribution',
  '0 0 * * *',
  'SELECT distribute_daily_profit()'
);
```

---

## 🧪 Pruebas Manuales

### Ejecutar Función Manualmente

```sql
-- Ejecutar distribución
SELECT distribute_daily_profit();

-- Ver logs en NOTICE
-- NOTICE: Usuario test (test@email.com) - Inversión: $100.00, Ganancia: $3.00
-- NOTICE: Distribución de ganancias diarias completada exitosamente
```

### Ver Resultados

```sql
-- Ver wallets activas
SELECT * FROM get_all_active_wallets();

-- Ver transacciones recientes
SELECT * FROM get_recent_profit_transactions(10);

-- Ver balances actualizados
SELECT 
  p.username,
  w.balance_invertido,
  w.balance_disponible,
  w.profit_daily
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.is_active = true
ORDER BY w.balance_invertido DESC;
```

---

## 📊 Función `distribute_daily_profit()`

### ¿Qué hace?

1. ✅ Itera sobre usuarios activos con `balance_invertido > 0`
2. ✅ Calcula el 3% del balance invertido
3. ✅ Actualiza `balance_disponible` y `profit_daily`
4. ✅ Crea transacción tipo `'profit'`

### Ejemplo de Cálculo

| Usuario | Balance Invertido | 3% Ganancia | Nuevo Balance Disponible |
|---------|------------------|-------------|-------------------------|
| User A  | $100.00          | $3.00       | +$3.00                  |
| User B  | $70.00           | $2.10       | +$2.10                  |
| User C  | $10.00           | $0.30       | +$0.30                  |

---

## 📁 Archivos

| Archivo | Propósito |
|---------|-----------|
| `importante/sql/DAILY_PROFIT_PGCRON.sql` | **Script principal** (usar este) |
| `importante/sql/DAILY_PROFIT_DISTRIBUTION.sql` | Script anterior (obsoleto) |
| `scripts/daily-profit-cron.js` | Script Node.js (ya no necesario) |

---

## ⚠️ Archivos Obsoletos

Los siguientes archivos **ya no son necesarios** con pg_cron:

- ❌ `scripts/daily-profit-cron.js` (script Node.js externo)
- ❌ `scripts/setup-cron.sh` (setup de cron del sistema)
- ❌ `.github/workflows/daily-profit.yml` (GitHub Actions)
- ❌ `CRON_JOB_DOCUMENTACION.md` (documentación antigua)

Puedes eliminarlos o mantenerlos como referencia.

---

## 🔐 Seguridad

### SECURITY DEFINER

La función `distribute_daily_profit()` usa `SECURITY DEFINER`, lo que significa:

- ✅ Se ejecuta con los permisos del creador (postgres)
- ✅ Puede hacer UPDATE/INSERT sin restricciones de RLS
- ✅ Los usuarios normales solo pueden ejecutarla vía cron job

### Permisos

```sql
-- Grants automáticos al crear la función
GRANT EXECUTE ON FUNCTION distribute_daily_profit() TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_daily_profit() TO anon;
```

---

## 🆘 Solución de Problemas

### Error: "extension 'pg_cron' is not available"

**Solución**: Habilitar en Supabase Dashboard:
1. Ir a **Database** → **Extensions**
2. Buscar `pg_cron`
3. Click en **Enable**

### Error: "permission denied for schema cron"

**Solución**: Solo el owner de la DB puede crear cron jobs. Usar la conexión de postgres.

### El cron no se ejecuta

**Verificar**:
```sql
-- Ver si el job está activo
SELECT jobid, jobname, active FROM cron.job WHERE jobname = 'daily-profit-distribution';

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

### Error en la ejecución

**Ver logs**:
```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📞 Comandos Rápidos

```sql
-- ============================================
-- RESUMEN DE COMANDOS ÚTILES
-- ============================================

-- 1. Ver cron job
SELECT jobid, jobname, schedule, active FROM cron.job;

-- 2. Pausar
SELECT cron.alter_job(1, active := false);

-- 3. Reactivar
SELECT cron.alter_job(1, active := true);

-- 4. Eliminar
SELECT cron.unschedule('daily-profit-distribution');

-- 5. Recrear
SELECT cron.schedule('daily-profit-distribution', '0 0 * * *', 'SELECT distribute_daily_profit()');

-- 6. Ejecutar manual
SELECT distribute_daily_profit();

-- 7. Ver resultados
SELECT * FROM get_all_active_wallets();
SELECT * FROM get_recent_profit_transactions(5);

-- 8. Ver historial
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## ✅ Checklist de Verificación

- [ ] pg_cron está habilitado en Supabase
- [ ] Script SQL ejecutado correctamente
- [ ] Cron job creado y activo
- [ ] Función `distribute_daily_profit()` existe
- [ ] Funciones helper existen
- [ ] Prueba manual ejecutada exitosamente
- [ ] Logs de ejecución verificados

---

## 🎯 Conclusión

Con pg_cron, el sistema de ganancias diarias es:

- ✅ **Más simple**: Solo SQL, sin scripts externos
- ✅ **Más confiable**: Corre dentro de la base de datos
- ✅ **Más barato**: No requiere servidor 24/7
- ✅ **Más fácil de monitorear**: Logs en la DB

**¡Listo para distribuir ganancias automáticamente!** 🚀
