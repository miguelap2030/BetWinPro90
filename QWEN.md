# BetWinPro90 - Contexto del Proyecto

## 📋 Descripción General

**BetWinPro90** es una plataforma de inversión en criptomonedas con sistema MLM (Multi-Level Marketing) unilevel y apuestas deportivas. Es una aplicación web moderna construida con React, Vite y TailwindCSS, que utiliza Supabase como backend (autenticación, base de datos PostgreSQL y almacenamiento).

### Características Principales

- **Inversión Cripto**: Ganancias diarias del 3% sobre capital invertido
- **Sistema MLM Unilevel**: Comisiones del 5%, 3% y 1% por 3 niveles de referidos
- **Apuestas Deportivas**: Módulo de apuestas (en desarrollo)
- **Transacciones**: Depósitos, retiros y transferencias internas
- **Dashboard**: Panel de control con métricas de inversión y red MLM
- **Panel Admin**: Gestión de usuarios, aprobación de depósitos/retiros

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 7 |
| Estilos | TailwindCSS 3.4 |
| Estado/Cache | TanStack Query 5 |
| Rutas | React Router DOM 6 |
| Iconos | Lucide React |
| Backend | Supabase (PostgreSQL + Auth) |
| ORM | Supabase JS Client 2 |

### Estructura de Directorios

```
BetWinPro90/
├── src/
│   ├── components/       # Componentes UI (SignIn, SignUp, Sidebar, AdminRoute)
│   ├── hooks/            # Custom hooks con React Query (useQueries.js, useAdminRole.js)
│   ├── lib/              # Utilidades y clientes (supabaseClient.js)
│   ├── pages/            # Páginas del dashboard
│   │   ├── Principal.jsx     # Vista principal
│   │   ├── Panel.jsx         # Panel de inversión
│   │   ├── Equipo.jsx        # Árbol de referidos MLM
│   │   ├── Transacciones.jsx # Historial de transacciones
│   │   ├── Cuenta.jsx        # Configuración de cuenta
│   │   ├── Depositar.jsx     # Página de depósito
│   │   ├── Retirar.jsx       # Página de retiro
│   │   ├── Transferir.jsx    # Transferencias internas
│   │   ├── VerifyProfiles.jsx# Verificación de perfiles
│   │   └── admin/            # Panel de administración
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminUsers.jsx
│   │       ├── AdminDeposits.jsx
│   │       └── AdminWithdrawals.jsx
│   ├── providers/        # Proveedores de contexto (QueryProvider)
│   ├── App.jsx           # Configuración de rutas
│   ├── main.jsx          # Punto de entrada
│   └── index.css         # Estilos globales + Tailwind
├── importante/           # Scripts SQL y documentación de BD
├── public/               # Assets estáticos
├── index.html            # HTML base
├── package.json          # Dependencias y scripts
├── vite.config.js        # Configuración de Vite
├── tailwind.config.js    # Configuración de Tailwind
└── .env                  # Variables de entorno (no commitear)
```

---

## 🚀 Comandos de Desarrollo

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

### Build de Producción

```bash
npm run build
```

### Preview del Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

---

## 🔐 Configuración de Variables de Entorno

Crear archivo `.env` basado en `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

**URL del proyecto Supabase**: `https://alyboipgbixoufqftizd.supabase.co`

---

## 📊 Base de Datos (Supabase PostgreSQL)

### Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Datos de usuario (username, email, referral_code, sponsor_id, role) |
| `wallets` | Balances (disponible, invertido, comisiones, retirado) |
| `deposits` | Depósitos de usuarios |
| `withdrawals` | Retiros de usuarios |
| `transactions` | Historial de transacciones |
| `transfers_internas` | Transferencias entre wallets |
| `mlm_commissions` | Registro de comisiones MLM |
| `bets` | Apuestas deportivas |

### Funciones RPC Clave

| Función | Descripción |
|---------|-------------|
| `get_referrals_tree_recursive(user_id)` | Obtiene toda la red MLM (hasta nivel 3) |
| `get_referrals_by_level_recursive(user_id, level)` | Referidos por nivel específico |
| `get_referral_counts_recursive(user_id)` | Conteo de referidos por nivel |
| `get_user_upline_recursive(user_id)` | Obtiene ascendencia (sponsors) |
| `get_user_dashboard_summary(user_id)` | Resumen del dashboard |
| `get_user_transactions(user_id, limit)` | Historial de transacciones |
| `get_commissions_by_user(user_id)` | Comisiones MLM recibidas |
| `distribute_deposit_commissions(deposit_id)` | Distribuye comisiones automáticamente |
| `create_user_profile(...)` | Crea perfil al registrar usuario |
| `is_user_admin()` | Verifica si usuario es administrador |
| `get_admin_dashboard_stats()` | Estadísticas para admin |
| `distribute_daily_profit()` | Distribuye ganancias diarias (3%) |

### Sistema MLM Unilevel

**Estructura de comisiones:**
- **Nivel 1**: 5% (referido directo)
- **Nivel 2**: 3% (referido del referido)
- **Nivel 3**: 1% (tercer nivel)

**Características:**
- Cálculo en tiempo real con CTE recursivo
- Sin tabla `referrals` (se calcula desde `profiles.sponsor_id`)
- Trigger automático `trg_deposit_completed` distribuye comisiones
- Manejo automático de sponsors NULL

### Sistema de Ganancias Diarias

- **Porcentaje**: 3% diario sobre `balance_invertido`
- **Ejecución**: Automática vía pg_cron a las 00:00 UTC
- **Función**: `distribute_daily_profit()`
- **Registro**: Crea transacciones tipo `'profit'`

---

## 🎨 Convenciones de Desarrollo

### Estilos y Diseño

- **Tema**: Oscuro con gradientes púrpura/pink
- **Componentes glass**: `glass-card`, `glass-input`
- **Botones**: `gradient-btn` (primario), `secondary-btn` (secundario)
- **Animaciones**: `fade-in` para entradas

### Patrones de Código

1. **React Query para todo**: Todas las consultas usan `useQuery`/`useMutation`
2. **Invalidación de caché**: Después de mutaciones, invalidar queries relacionados
3. **Rutas protegidas**: Componentes `ProtectedRoute` y `AdminRoute` verifican autenticación y roles
4. **Hooks personalizados**: Lógica de negocio en `src/hooks/useQueries.js` y `useAdminRole.js`

### Estructura de Componentes

```jsx
// 1. Imports
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// 2. Componente
export default function MiComponente() {
  // 3. Estado local
  const [loading, setLoading] = useState(false)
  
  // 4. Efectos
  useEffect(() => {
    // lógica
  }, [])
  
  // 5. Handlers
  const handleClick = async () => {
    // lógica
  }
  
  // 6. Render
  return <div>...</div>
}
```

---

## 🧪 Pruebas del Sistema MLM

### Flujo de Registro

1. Usuario se registra en `/signup`
2. Se busca sponsor por `referral_code` (opcional)
3. Crea usuario en Supabase Auth
4. Espera 1.5 segundos
5. Inserta perfil en `profiles` con `sponsor_id`
6. Inserta wallet en `wallets`
7. El árbol MLM se calcula con CTE recursivo

---

## 📁 Archivos de Documentación Importantes

| Archivo | Contenido |
|---------|-----------|
| `COMISIONES_MLM_DOCUMENTACION.md` | Sistema de comisiones y distribución |
| `ADMIN_CONFIG.md` | Configuración de administradores |
| `README_DOCS.md` | Referencia de cron jobs y estructura |
| `importante/sql/*.sql` | Scripts SQL para configurar BD |

---

## 🔧 Solución de Problemas Comunes

### Error: "Faltan las variables de entorno de Supabase"

**Solución**: Crear archivo `.env` con las credenciales correctas.

### Error: "relation does not exist"

**Solución**: Ejecutar scripts SQL en `importante/` en orden:
1. `LIMPIEZA_Y_POLITICAS.sql`
2. `SISTEMA_MLM_UNILEVEL_CTE.sql`
3. `SISTEMA_COMISIONES_MLM.sql`

### Los referidos no aparecen

**Solución**: Verificar que:
- El `sponsor_id` está configurado correctamente
- Las funciones RPC están creadas en Supabase
- Las políticas RLS permiten lectura

### Comisiones no se distribuyen

**Solución**: Verificar:
- El depósito tiene `status = 'completed'`
- El trigger `trg_deposit_completed` existe
- Los usuarios tienen `sponsor_id` configurado

### Admin no puede acceder

**Solución**:
1. Verificar que `role = 'admin'` en `profiles`
2. Ejecutar script `ADMIN_ROLE_VERIFICATION.sql`
3. Verificar que `is_user_admin()` retorna `true`

---

## 📞 Recursos Adicionales

- **Supabase Dashboard**: https://supabase.com/dashboard
- **TanStack Query Docs**: https://tanstack.com/query/latest
- **TailwindCSS**: https://tailwindcss.com/docs
- **React Router**: https://reactrouter.com/

---

## 🔑 Hooks Disponibles

### Autenticación
- `useAuth()` - Estado de sesión
- `useSignIn()` - Iniciar sesión
- `useSignUp()` - Registrar usuario
- `useSignOut()` - Cerrar sesión

### Perfil y Wallet
- `useProfile(userId)` - Datos del perfil
- `useWallet(userId)` - Balance del usuario
- `useDailyProfit(userId)` - Ganancias diarias

### Dashboard y MLM
- `useDashboardSummary(userId)` - Resumen del dashboard
- `useReferralsTree(userId)` - Árbol de referidos
- `useTransactions(userId, limit)` - Historial de transacciones
- `useCommissions(userId)` - Comisiones MLM

### Operaciones
- `useCreateDeposit()` - Crear depósito
- `useCreateWithdrawal()` - Crear retiro
- `useTransferInternal()` - Transferencia interna

### Admin
- `useAdminRole()` - Verificar rol de administrador
- `useAdminDashboardStats()` - Estadísticas de admin
