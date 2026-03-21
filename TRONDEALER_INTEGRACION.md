# Integración con TronDealer

## Descripción

Esta documentación describe la integración de BetWinPro90 con **TronDealer**, la plataforma de pagos en criptomonedas que permite gestionar wallets USDT en la red BSC y procesar depósitos automáticamente.

---

## 📋 Componentes de la Integración

### 1. Edge Functions de Supabase

#### `crear-wallet`
- **URL**: `https://<project-ref>.supabase.co/functions/v1/crear-wallet`
- **Método**: POST
- **Propósito**: Crea una wallet de TronDealer para un usuario

**Request Body:**
```json
{
  "user_id": "uuid-del-usuario",
  "username": "nombredeusuario"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "wallet": {
    "id": "uuid-wallet-local",
    "trondealer_wallet_id": "uuid-trondealer",
    "address": "0xdD27Fe8E3fE9180283E2D0F1a51d1da599CFC1E3",
    "label": "us",
    "user_id": "uuid-del-usuario"
  }
}
```

#### `webhook-trondealer`
- **URL**: `https://<project-ref>.supabase.co/functions/v1/webhook-trondealer`
- **Método**: POST
- **Propósito**: Procesa webhooks de TronDealer cuando se confirma una transacción

**Webhook Payload (de TronDealer):**
```json
{
  "event": "transaction.confirmed",
  "timestamp": "2026-03-20T19:20:23.558Z",
  "data": {
    "tx_hash": "0x1172f1a502b313524ac720097f2079674227bdc1337e2b5c6e9b33e9d415f478",
    "block_number": 87745902,
    "from_address": "0xf476b1f997f4a82C2dc60Ce1694fD24E8CAfC63D",
    "to_address": "0x922A22d6546DBAf296e2ba252De144A5932b9aB9",
    "asset": "USDT",
    "amount": "0.01",
    "confirmations": 87746079,
    "wallet_label": "userprueba",
    "network": "bsc"
  }
}
```

---

### 2. Funciones RPC de PostgreSQL

#### `process_trondealer_deposit`
Procesa un depósito desde el webhook de TronDealer.

**Parámetros:**
- `p_user_id`: UUID del usuario
- `p_tx_hash`: Hash de la transacción
- `p_from_address`: Dirección de origen
- `p_to_address`: Dirección de destino
- `p_asset`: Activo (ej. USDT)
- `p_amount`: Monto del depósito
- `p_network`: Red (ej. bsc)
- `p_block_number`: Número de bloque
- `p_confirmations`: Número de confirmaciones
- `p_wallet_label`: Label de la wallet

**Retorna:**
```json
{
  "success": true,
  "deposit_id": "uuid-del-deposito",
  "amount": 0.01,
  "new_balance": 100.01
}
```

#### `create_trondealer_wallet`
Crea/actualiza wallet de usuario con datos de TronDealer.

#### `get_trondealer_deposits`
Obtiene el historial de depósitos de TronDealer para un usuario.

---

### 3. Hooks de React Query

#### `useCreateTronDealerWallet()`
Crea una wallet de TronDealer para un usuario.

**Uso:**
```javascript
const createWallet = useCreateTronDealerWallet()

createWallet.mutate(
  { userId: user.id, username: user.username },
  {
    onSuccess: (wallet) => console.log('Wallet creada:', wallet),
    onError: (error) => console.error('Error:', error),
  }
)
```

#### `useTronDealerDeposits(userId, limit = 20)`
Obtiene los depósitos de TronDealer de un usuario.

**Uso:**
```javascript
const { data: deposits, isLoading, error } = useTronDealerDeposits(userId)
```

---

## 🚀 Configuración en Supabase

### 1. Ejecutar Script SQL

Ejecuta el archivo `importante/sql/TRONDEALER_INTEGRACION.sql` en el SQL Editor de Supabase.

### 2. Configurar Variables de Entorno en Supabase

Ve a **Settings > Edge Functions** y configura:

```
TRONDEALER_API_KEY=td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81
```

### 3. Desplegar Edge Functions

```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Login a Supabase
supabase login

# Vincular proyecto
supabase link --project-ref <tu-project-ref>

# Desplegar funciones
supabase functions deploy crear-wallet
supabase functions deploy webhook-trondealer
```

### 4. Configurar Webhook en TronDealer

En el dashboard de TronDealer, configura el webhook:

- **URL**: `https://<project-ref>.supabase.co/functions/v1/webhook-trondealer`
- **Eventos**: `transaction.confirmed`
- **Headers**: (ninguno requerido, la función es pública)

---

## 📊 Flujo de Depósito

1. **Usuario** hace depósito a la dirección USDT proporcionada
2. **TronDealer** detecta la transacción y espera confirmaciones
3. **TronDealer** envía webhook a `webhook-trondealer` Edge Function
4. **Edge Function**:
   - Busca usuario por `wallet_label`
   - Llama a RPC `process_trondealer_deposit`
5. **RPC Function**:
   - Registra depósito en `trondealer_deposits`
   - Actualiza balance en `wallets`
   - Crea transacción en `transactions`
6. **Usuario** ve el saldo actualizado en su dashboard

---

## 📊 Flujo de Creación de Wallet

1. **Usuario** se registra en BetWinPro90
2. **Sistema** espera 2 segundos después del registro
3. **useSignUp hook** llama a `useCreateTronDealerWallet`
4. **Edge Function `crear-wallet`**:
   - Llama a API de TronDealer
   - Recibe datos de wallet creada
   - Actualiza `profiles` y `wallets` en DB
5. **Usuario** tiene wallet de TronDealer asociada automáticamente

---

## 🔐 Seguridad

### API Key de TronDealer
- Almacenada en variables de entorno de Supabase
- Nunca expuesta en el frontend
- Solo accesible desde Edge Functions

### Row Level Security (RLS)
- Tabla `trondealer_deposits` tiene RLS habilitado
- Usuarios solo pueden ver sus propios depósitos
- Service role puede gestionar todos los depósitos

---

## 🧪 Pruebas

### Probar Creación de Wallet

```javascript
// Desde la consola del navegador
const { data: { user } } = supabase.auth.getUser()
const response = await fetch('https://<project-ref>.supabase.co/functions/v1/crear-wallet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
  },
  body: JSON.stringify({
    user_id: user.id,
    username: user.user_metadata.username || 'testuser'
  })
})
console.log(await response.json())
```

### Probar Webhook (Simulación)

```bash
curl -X POST 'https://<project-ref>.supabase.co/functions/v1/webhook-trondealer' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transaction.confirmed",
    "timestamp": "2026-03-20T19:20:23.558Z",
    "data": {
      "tx_hash": "0xTEST123456789",
      "block_number": 87745902,
      "from_address": "0xf476b1f997f4a82C2dc60Ce1694fD24E8CAfC63D",
      "to_address": "0x922A22d6546DBAf296e2ba252De144A5932b9aB9",
      "asset": "USDT",
      "amount": "0.01",
      "confirmations": 1,
      "wallet_label": "testuser",
      "network": "bsc"
    }
  }'
```

---

## 📁 Estructura de Archivos

```
BetWinPro90/
├── supabase/
│   └── functions/
│       ├── crear-wallet/
│       │   └── index.ts
│       └── webhook-trondealer/
│           └── index.ts
├── src/
│   ├── hooks/
│   │   └── useQueries.js (actualizado con hooks de TronDealer)
│   └── lib/
│       └── supabaseClient.js (actualizado con functionsUrl)
└── importante/
    └── sql/
        └── TRONDEALER_INTEGRACION.sql
```

---

## 🔧 Solución de Problemas

### Error: "TRONDEALER_API_KEY not configured"
- Verificar que la variable de entorno está configurada en Supabase
- Re-desplegar Edge Function después de configurar la variable

### Error: "User not found for wallet label"
- Verificar que el usuario tiene `trondealer_label` en profiles
- Asegurar que la wallet se creó correctamente

### Error: "Deposit already processed"
- La transacción ya fue procesada (tx_hash duplicado)
- Verificar que TronDealer no está enviando webhooks duplicados

### Logs de Edge Functions
```bash
supabase functions logs crear-wallet
supabase functions logs webhook-trondealer
```

---

## 📝 Notas Importantes

1. **API Key**: La API key de TronDealer es sensible y debe mantenerse en secreto
2. **Idempotencia**: La función de depósito es idempotente (no procesa tx_hash duplicados)
3. **Confirmaciones**: TronDealer maneja las confirmaciones de red automáticamente
4. **Red Soportada**: Actualmente solo BSC (Binance Smart Chain)
5. **Activo**: USDT (Tether)

---

## 🆘 Soporte

Para problemas con la integración:
1. Revisar logs de Edge Functions
2. Verificar configuración de variables de entorno
3. Comprobar que las funciones RPC están creadas
4. Validar que las políticas RLS están configuradas correctamente
