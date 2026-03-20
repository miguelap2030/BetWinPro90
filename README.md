# Frontend - BetWinPro90

Aplicación React para la plataforma de inversión BetWinPro90.

## Stack Tecnológico

- **React 19**
- **Vite 7**
- **TailwindCSS 3.4**
- **TanStack Query 5** (React Query)
- **React Router DOM 6**
- **Lucide React** (iconos)
- **Supabase** (Auth + PostgreSQL + Storage)

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## Variables de Entorno

Crear archivo `.env`:

```
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Estructura de Directorios

```
src/
├── components/       # Componentes UI reutilizables
├── hooks/            # Custom hooks con React Query
├── lib/              # Utilidades y clientes
├── pages/            # Páginas del dashboard
├── providers/        # Proveedores de contexto
├── App.jsx           # Configuración de rutas
└── main.jsx          # Punto de entrada
```

## TanStack Query

Todos los datos se manejan con React Query:

### Hooks Disponibles

**Autenticación:**
- `useAuth()` - Estado de sesión
- `useSignIn()` - Iniciar sesión
- `useSignUp()` - Registrar usuario
- `useSignOut()` - Cerrar sesión

**Perfil y Wallet:**
- `useProfile(userId)` - Datos del perfil
- `useWallet(userId)` - Balance del usuario
- `useDailyProfit(userId)` - Ganancias diarias

**Dashboard y MLM:**
- `useDashboardSummary(userId)` - Resumen del dashboard
- `useReferralsTree(userId)` - Árbol de referidos
- `useTransactions(userId, limit)` - Historial
- `useCommissions(userId)` - Comisiones MLM

**Operaciones:**
- `useCreateDeposit()` - Crear depósito
- `useCreateWithdrawal()` - Crear retiro
- `useTransferInternal()` - Transferencia interna

**Admin:**
- `useAdminRole()` - Verificar rol admin
- `useAdminDashboardStats()` - Estadísticas

## Configuración de Query Client

Ver `src/providers/QueryProvider.jsx`

```javascript
// Configuración actual:
- staleTime: 1000 * 60 * 5 (5 minutos)
- cacheTime: 1000 * 60 * 30 (30 minutos)
- retries: 3
```

## Páginas del Dashboard

- `/dashboard/principal` - Página principal informativa
- `/dashboard/panel` - Panel de inversión
- `/dashboard/equipo` - Árbol de referidos MLM
- `/dashboard/transacciones` - Historial
- `/dashboard/cuenta` - Configuración
- `/dashboard/depositar` - Depósitos
- `/dashboard/retirar` - Retiros
- `/dashboard/transferir` - Transferencias internas
- `/admin/dashboard` - Panel de administración

---

© 2024 BetWinPro90
