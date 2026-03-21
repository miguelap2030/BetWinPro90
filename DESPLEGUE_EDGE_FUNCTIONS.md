# 🚀 Despliegue Manual de Edge Functions - TronDealer

## Contexto

El despliegue de Edge Functions requiere autenticación OAuth2 del Dashboard de Supabase. Este documento proporciona instrucciones paso a paso para desplegar las funciones manualmente.

---

## 📋 Opción 1: Usando Supabase CLI (Recomendado)

### Requisitos
- Tener Node.js instalado en tu computadora
- Sistema operativo: Windows, macOS, o Linux (no Android)

### Pasos

#### 1. Instalar Supabase CLI

```bash
# Usando npm
npm install -g supabase

# O usando Homebrew (macOS)
brew install supabase/tap/supabase

# O usando Chocolatey (Windows)
choco install supabase
```

#### 2. Iniciar sesión en Supabase

```bash
supabase login
```

Esto abrirá una ventana del navegador para autenticarte.

#### 3. Vincular el proyecto

```bash
supabase link --project-ref alyboipgbixoufqftizd
```

#### 4. Desplegar las funciones

```bash
# Desplegar función crear-wallet
supabase functions deploy crear-wallet

# Desplegar función webhook-trondealer
supabase functions deploy webhook-trondealer
```

#### 5. Configurar variables de entorno

```bash
# Configurar TRONDEALER_API_KEY
supabase secrets set TRONDEALER_API_KEY=td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81

# Configurar SUPABASE_URL
supabase secrets set SUPABASE_URL=https://alyboipgbixoufqftizd.supabase.co

# Configurar SUPABASE_SERVICE_ROLE_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M
```

---

## 📋 Opción 2: Desde el Dashboard de Supabase (Sin CLI)

### Pasos para desplegar las funciones:

#### 1. Ir al Dashboard de Supabase
- URL: https://supabase.com/dashboard/project/alyboipgbixoufqftizd

#### 2. Navegar a Edge Functions
- En el menú lateral, hacer clic en **Edge Functions**
- Hacer clic en **New Function**

#### 3. Crear función `crear-wallet`
- **Name**: `crear-wallet`
- **Slug**: `crear-wallet`
- Hacer clic en **Create Function**

#### 4. Copiar el código
- Abrir el archivo: `supabase/functions/crear-wallet/index.ts`
- Copiar TODO el contenido del archivo
- Pegar en el editor del Dashboard
- Hacer clic en **Save Changes**

#### 5. Repetir para `webhook-trondealer`
- Crear nueva función llamada `webhook-trondealer`
- Copiar el contenido de `supabase/functions/webhook-trondealer/index.ts`
- Pegar y guardar

#### 6. Configurar Variables de Entorno
- En el Dashboard, ir a **Edge Functions** > **Environment Variables**
- Agregar las siguientes variables:

| Variable | Valor |
|----------|-------|
| `TRONDEALER_API_KEY` | `td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81` |
| `SUPABASE_URL` | `https://alyboipgbixoufqftizd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M` |

---

## ✅ Verificación del Despliegue

### 1. Verificar que las funciones existen

Ir a:
- https://alyboipgbixoufqftizd.supabase.co/functions/v1/crear-wallet
- https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer

Deberías ver una respuesta JSON (no una página HTML).

### 2. Probar la función `crear-wallet`

```bash
curl -X POST 'https://alyboipgbixoufqftizd.supabase.co/functions/v1/crear-wallet' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjIyMTAsImV4cCI6MjA4ODgzODIxMH0.U10Xs0oHF0onn2CxHiuiNKfA9Dz8yWgap3Kn3zocRkA' \
  -d '{
    "user_id": "<TU_USER_ID>",
    "username": "testuser"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "wallet": {
    "id": "...",
    "trondealer_wallet_id": "...",
    "address": "0x...",
    "label": "testuser",
    "user_id": "..."
  }
}
```

### 3. Probar el webhook (simulación)

```bash
curl -X POST 'https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transaction.confirmed",
    "data": {
      "tx_hash": "0xTEST123456789ABCDEF",
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

Respuesta esperada:
```json
{
  "success": true,
  "message": "Deposit processed successfully",
  "data": { ... }
}
```

---

## 🔧 Solución de Problemas

### Error: "TRONDEALER_API_KEY not configured"
- Las variables de entorno no están configuradas
- Ir a Dashboard > Edge Functions > Environment Variables
- Agregar todas las variables listadas arriba
- Re-desplegar la función después de configurar las variables

### Error: "Function not found"
- La función no ha sido desplegada
- Seguir los pasos de despliegue manual

### Error: "User not found for wallet label"
- El usuario no tiene una wallet de TronDealer generada
- El `username` no coincide con `trondealer_label` en la tabla `profiles`
- Primero generar la wallet usando la función `crear-wallet`

### Error: "Invalid JWT"
- El token de autenticación es inválido o expiró
- Usar el token correcto del usuario autenticado

---

## 📝 Notas Importantes

1. **Service Role Key**: Es una credencial sensible. No compartirla ni subirla al repositorio.

2. **Variables de Entorno**: Deben configurarse en el Dashboard, NO en el código.

3. **Orden de despliegue**:
   - Primero ejecutar el script SQL (`importante/sql/TRONDEALER_INTEGRACION.sql`)
   - Luego desplegar las Edge Functions
   - Finalmente configurar las variables de entorno

4. **URLs de las funciones desplegadas**:
   - `crear-wallet`: https://alyboipgbixoufqftizd.supabase.co/functions/v1/crear-wallet
   - `webhook-trondealer`: https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer

---

## 🆘 Soporte

Si tienes problemas:
1. Revisar los logs en el Dashboard de Supabase
2. Verificar que las variables de entorno estén configuradas
3. Comprobar que las funciones RPC están creadas en la base de datos
4. Validar que las políticas RLS están configuradas correctamente
