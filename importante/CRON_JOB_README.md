# ⏰ Cron Job BetWinPro90 - pg_cron

## ✅ Estado: IMPLEMENTADO CON PG_CRON

El cron job está configurado directamente en la base de datos usando **pg_cron**.

---

## 📋 Configuración Actual

| Parámetro | Valor |
|-----------|-------|
| **Job Name** | `daily-profit-distribution` |
| **Schedule** | `0 0 * * *` (diario a las 00:00 UTC) |
| **Comando** | `SELECT distribute_daily_profit()` |
| **Estado** | ✅ Activo |

---

## 🚀 Comandos Útiles

### Ver Estado del Cron Job

```bash
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'daily-profit-distribution';"
```

### Ver Historial de Ejecuciones

```bash
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT start_time, end_time, status, return_message FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;"
```

### Ejecutar Manualmente (Testing)

```bash
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT distribute_daily_profit();"
```

### Ver Resultados

```bash
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT * FROM get_all_active_wallets();"
```

---

## 📁 Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `importante/sql/DAILY_PROFIT_PGCRON.sql` | **Script principal** - Contiene la función y configuración del cron |
| `CRON_JOB_PGCORN.md` | Documentación completa |
| `CRON_JOB_RESUMEN.md` | Resumen ejecutivo |

---

## 🔧 Administración

### Pausar Cron Job

```sql
SELECT cron.alter_job(1, active := false);
```

### Reactivar Cron Job

```sql
SELECT cron.alter_job(1, active := true);
```

### Eliminar Cron Job

```sql
SELECT cron.unschedule('daily-profit-distribution');
```

---

## 📊 ¿Qué hace el Cron Job?

Todos los días a las **00:00 UTC**:

1. ✅ Busca usuarios activos con `balance_invertido > 0`
2. ✅ Calcula el **3%** del balance invertido
3. ✅ Agrega ganancias al `balance_disponible`
4. ✅ Actualiza `profit_daily` acumulado
5. ✅ Crea transacción tipo `'profit'`

---

## 🧪 Prueba Rápida

```bash
# 1. Ejecutar manualmente
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT distribute_daily_profit();"

# 2. Ver resultados
psql "postgresql://postgres.alyboipgbixoufqftizd:Mm23139053*@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -c "SELECT username, balance_invertido, balance_disponible, profit_daily FROM wallets w JOIN profiles p ON w.user_id = p.id WHERE p.is_active = true ORDER BY balance_invertido DESC;"
```

---

## ⚠️ Archivos Obsoletos (ya no necesarios)

Los siguientes archivos fueron creados inicialmente pero **ya no son necesarios** con pg_cron:

- ❌ `scripts/daily-profit-cron.js`
- ❌ `scripts/setup-cron.sh`
- ❌ `.github/workflows/daily-profit.yml`

Puedes eliminarlos si lo deseas.

---

## 📞 Soporte

Ver documentación completa en: `CRON_JOB_PGCORN.md`
