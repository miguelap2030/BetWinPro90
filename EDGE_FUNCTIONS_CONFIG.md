# Configuración de Variables de Entorno para Edge Functions

## Instrucciones

Para que las Edge Functions de TronDealer funcionen correctamente, debes configurar las siguientes variables de entorno en el **Dashboard de Supabase**:

### Pasos:

1. Ve a https://supabase.com/dashboard/project/alyboipgbixoufqftizd
2. Navega a **Edge Functions** > **Variables de entorno**
3. Agrega las siguientes variables:

## Variables Requeridas

### 1. TRONDEALER_API_KEY
```
td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81
```

**Propósito**: API key para autenticar con la API de TronDealer

---

### 2. SUPABASE_URL
```
https://alyboipgbixoufqftizd.supabase.co
```

**Propósito**: URL base de tu proyecto Supabase

---

### 3. SUPABASE_SERVICE_ROLE_KEY
```
(Obtener desde Dashboard > Settings > API > Service Role Key)
```

**Propósito**: Key de servicio para operaciones administrativas desde las Edge Functions

**Importante**: Esta key debe obtenerse directamente del dashboard de Supabase, ya que es única para tu proyecto.

---

## Despliegue de Edge Functions

Después de configurar las variables de entorno, despliega las funciones:

```bash
# Instalar Supabase CLI si no está instalado
npm install -g supabase

# Login a Supabase
supabase login

# Vincular proyecto (si no está vinculado)
supabase link --project-ref alyboipgbixoufqftizd

# Desplegar funciones
supabase functions deploy crear-wallet
supabase functions deploy webhook-trondealer
```

---

## Verificación

### 1. Verificar que las variables están configuradas:

```bash
supabase functions list
```

### 2. Probar la función `crear-wallet`:

```bash
curl -X POST 'https://alyboipgbixoufqftizd.supabase.co/functions/v1/crear-wallet' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "user_id": "YOUR_USER_ID",
    "username": "testuser"
  }'
```

### 3. Probar el webhook (simulación):

```bash
curl -X POST 'https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer' \
  -H 'Content-Type: application/json' \
  -d '{
    "event": "transaction.confirmed",
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

## Logs de Edge Functions

Para ver los logs de las funciones:

```bash
# Logs en tiempo real
supabase functions logs crear-wallet --tail
supabase functions logs webhook-trondealer --tail

# Últimos 50 logs
supabase functions logs crear-wallet --limit 50
```

---

## URLs de las Edge Functions

Una vez desplegadas, las funciones estarán disponibles en:

- **Crear Wallet**: `https://alyboipgbixoufqftizd.supabase.co/functions/v1/crear-wallet`
- **Webhook**: `https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer`

---

## Configuración del Webhook en TronDealer

En el dashboard de TronDealer:

1. Ve a **Settings** > **Webhooks**
2. Agrega nueva URL de webhook:
   ```
   https://alyboipgbixoufqftizd.supabase.co/functions/v1/webhook-trondealer
   ```
3. Selecciona el evento: `transaction.confirmed`
4. Guarda la configuración

---

## Solución de Problemas

### Error: "TRONDEALER_API_KEY not configured"
- Verifica que la variable esté configurada en Supabase Dashboard > Edge Functions > Environment Variables
- Re-despliega la función después de configurar la variable

### Error: "User not found for wallet label"
- El usuario debe tener una wallet generada primero
- Verifica que el `username` coincide con el `trondealer_label` en la tabla `profiles`

### Error: "Supabase credentials not configured"
- Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén configuradas
- Asegúrate de que la Service Role Key sea la correcta
