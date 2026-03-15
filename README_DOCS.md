# 📚 Documentación BetWinPro90

## 📁 Archivos de Documentación

| Archivo | Descripción |
|---------|-------------|
| `importante/CRON_JOB_README.md` | **Referencia rápida** del cron job de ganancias diarias |
| `importante/CRON_JOB_PGCORN.md` | Documentación **completa** de pg_cron |
| `importante/sql/DAILY_PROFIT_PGCRON.sql` | Script SQL con la función y configuración del cron |
| `COMISIONES_MLM_DOCUMENTACION.md` | Sistema de comisiones MLM |
| `QWEN.md` | Contexto general del proyecto |

---

## ⏰ Cron Job - Ganancias Diarias 3%

### Estado: ✅ IMPLEMENTADO CON PG_CRON

El cron job está configurado directamente en la base de datos de Supabase usando **pg_cron**.

**Configuración:**
- **Job**: `daily-profit-distribution`
- **Horario**: `0 0 * * *` (todos los días a las 00:00 UTC)
- **Función**: `SELECT distribute_daily_profit()`
- **Estado**: ✅ Activo

### Comandos Útiles

```bash
# Ver estado del cron job
psql "postgresql://..." -c "SELECT * FROM cron.job;"

# Ejecutar manualmente (testing)
psql "postgresql://..." -c "SELECT distribute_daily_profit();"

# Ver resultados
psql "postgresql://..." -c "SELECT * FROM get_all_active_wallets();"
```

### ¿Qué hace?

Todos los días a las **00:00 UTC**:
1. ✅ Busca usuarios activos con `balance_invertido > 0`
2. ✅ Calcula el **3%** del balance invertido
3. ✅ Agrega ganancias al `balance_disponible`
4. ✅ Actualiza `profit_daily` acumulado
5. ✅ Crea transacción tipo `'profit'`

---

## 🗑️ Limpieza Realizada

Se eliminaron los siguientes archivos obsoletos:

- ❌ `scripts/daily-profit-cron.js`
- ❌ `scripts/setup-cron.sh`
- ❌ `.github/workflows/daily-profit.yml`
- ❌ `importante/scripts/`
- ❌ `importante/test/`
- ❌ Todos los archivos .md antiguos en `importante/`

**Dependencias eliminadas:**
- `dotenv` (ya no necesaria)
- `pg` (ya no necesaria)
- `@mmmbuto/pty-termux-utils` (ya no necesaria)

---

## 📊 Estructura Actual

```
BetWinPro90/
├── importante/
│   ├── CRON_JOB_README.md       # Referencia rápida
│   ├── CRON_JOB_PGCORN.md       # Documentación completa
│   └── sql/
│       └── DAILY_PROFIT_PGCRON.sql  # Script principal
├── src/
├── package.json
└── ...
```

---

## 🚀 Próximos Pasos

El sistema está **completamente configurado y funcionando**. No se requiere ninguna acción adicional.

Para más detalles, ver: **`importante/CRON_JOB_README.md`**
