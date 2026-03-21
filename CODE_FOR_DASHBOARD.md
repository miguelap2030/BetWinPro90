# 📋 Código para Copiar en el Dashboard de Supabase

## Función 1: crear-wallet

**URL en Dashboard**: https://supabase.com/dashboard/project/alyboipgbixoufqftizd/functions

### Pasos:
1. Ir al Dashboard de Supabase > Edge Functions
2. Seleccionar la función `crear-wallet`
3. Borrar TODO el código existente
4. Copiar y pegar el siguiente código completo
5. Hacer clic en **Save Changes**

---

### Código para `crear-wallet`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const { username, user_id } = await req.json()

    if (!username) {
      throw new Error('Username is required')
    }

    if (!user_id) {
      throw new Error('User ID is required')
    }

    // TronDealer API configuration
    const TRONDEALER_API_KEY = Deno.env.get('TRONDEALER_API_KEY')
    const TRONDEALER_BASE_URL = 'https://trondealer.com/api/v2'

    if (!TRONDEALER_API_KEY) {
      console.error('TRONDEALER_API_KEY not configured in environment variables')
      throw new Error('TRONDEALER_API_KEY not configured')
    }

    console.log('Creating wallet for user:', username, user_id)

    // Create wallet in TronDealer
    const trondealerResponse = await fetch(`${TRONDEALER_BASE_URL}/wallets/assign`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': TRONDEALER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label: username }),
    })

    if (!trondealerResponse.ok) {
      const errorData = await trondealerResponse.text()
      console.error('TronDealer API error:', errorData)
      throw new Error(`TronDealer API error: ${errorData}`)
    }

    const trondealerData = await trondealerResponse.json()
    console.log('TronDealer response:', trondealerData)

    if (!trondealerData.success || !trondealerData.wallet) {
      throw new Error('Failed to create wallet in TronDealer')
    }

    const { id: trondealer_wallet_id, address, label } = trondealerData.wallet

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Update user's profile with TronDealer wallet info using RPC
    const { data: profileData, error: profileError } = await supabase
      .rpc('create_trondealer_wallet', {
        p_user_id: user_id,
        p_trondealer_wallet_id: trondealer_wallet_id,
        p_address: address,
        p_label: label,
      })

    if (profileError) {
      console.error('Error updating profile:', profileError)
      throw new Error(`Failed to update profile: ${profileError.message}`)
    }

    console.log('Wallet created successfully for user:', username)

    return new Response(
      JSON.stringify({
        success: true,
        wallet: {
          id: user_id,
          trondealer_wallet_id,
          address,
          label,
          user_id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating wallet:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

---

## Función 2: webhook-trondealer

### Pasos:
1. Ir al Dashboard de Supabase > Edge Functions
2. Seleccionar la función `webhook-trondealer`
3. Borrar TODO el código existente
4. Copiar y pegar el siguiente código completo
5. Hacer clic en **Save Changes**

---

### Código para `webhook-trondealer`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const payload = await req.json()

    console.log('Webhook received:', JSON.stringify(payload, null, 2))

    // Validate webhook payload
    const { event, data } = payload

    if (!event || !data) {
      throw new Error('Invalid webhook payload')
    }

    // Handle transaction.confirmed event
    if (event === 'transaction.confirmed') {
      const { 
        tx_hash, 
        block_number, 
        from_address, 
        to_address, 
        asset, 
        amount, 
        confirmations, 
        wallet_label, 
        network 
      } = data

      // Validate required fields
      if (!tx_hash || !wallet_label || !amount) {
        throw new Error('Missing required fields in webhook payload')
      }

      // Initialize Supabase client with service role
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error('Supabase credentials not configured')
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

      // Find user by trondealer_label (username)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('trondealer_label', wallet_label)
        .single()

      if (profileError || !profile) {
        console.error('User not found for wallet label:', wallet_label, profileError)
        throw new Error(`User not found for wallet label: ${wallet_label}`)
      }

      const user_id = profile.id
      console.log('User found:', profile.username, user_id)

      // Parse amount (handle decimal values)
      const depositAmount = parseFloat(amount)

      if (isNaN(depositAmount) || depositAmount <= 0) {
        throw new Error('Invalid deposit amount')
      }

      // Call RPC function to process deposit
      const { data: result, error: rpcError } = await supabase.rpc('process_trondealer_deposit', {
        p_user_id: user_id,
        p_tx_hash: tx_hash,
        p_from_address: from_address,
        p_to_address: to_address,
        p_asset: asset,
        p_amount: depositAmount,
        p_network: network,
        p_block_number: block_number,
        p_confirmations: confirmations,
        p_wallet_label: wallet_label,
      })

      if (rpcError) {
        console.error('RPC error:', rpcError)
        throw new Error(`Failed to process deposit: ${rpcError.message}`)
      }

      // Check if deposit was already processed
      if (result && !result.success) {
        console.warn('Deposit already processed:', result.error)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Deposit already processed',
            data: { tx_hash, user_id },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      console.log(`✅ Deposit processed successfully for user ${profile.username}: ${amount} ${asset}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Deposit processed successfully',
          data: {
            user_id,
            username: profile.username,
            amount: depositAmount,
            asset,
            tx_hash,
            result,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Handle other events if needed
    console.log(`Event ${event} received but not processed`)
    return new Response(
      JSON.stringify({
        success: true,
        message: `Event ${event} received but not processed`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

---

## 🔧 Configuración de Variables de Entorno

**IMPORTANTE**: Después de actualizar el código, configura las variables de entorno:

1. Ir a: https://supabase.com/dashboard/project/alyboipgbixoufqftizd/functions
2. Hacer clic en **Environment Variables** (o ir directamente a Edge Functions > Environment Variables)
3. Agregar las siguientes variables:

| Variable | Valor |
|----------|-------|
| `TRONDEALER_API_KEY` | `td_ea7bf3e85b2b6f1be683787aa6bcb654a91d4f24e5dbf6f98f06aa7595d71f81` |
| `SUPABASE_URL` | `https://alyboipgbixoufqftizd.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseWJvaXBnYml4b3VmcWZ0aXpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI2MjIxMCwiZXhwIjoyMDg4ODM4MjEwfQ.zEw5FLf1uLqO8hJzV9K3xPNr4fQ7bF2mXc8yHn1qJ9M` |

---

## ✅ Verificación

Después de actualizar el código y configurar las variables, ejecuta:

```bash
node scripts/test-trondealer.mjs a55dc144-7273-4e9d-b972-56630944bbb1 mlm_root
```

Deberías ver:
- ✅ Función crear-wallet [PASS] con wallet address
- ✅ CORS PreFlight [PASS]
- ✅ Webhook [PASS]

---

## 🔍 Logs en Vivo

Para ver los logs de las funciones en el Dashboard:
1. Ir a: https://supabase.com/dashboard/project/alyboipgbixoufqftizd/functions/logs
2. Seleccionar la función que quieres monitorear
3. Ver los logs en tiempo real
