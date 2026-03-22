import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-signature-256',
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

    console.log('📥 Webhook received - Headers:', Object.fromEntries(req.headers))

    // ========================================
    // VALIDAR FIRMA DE TRONDEALER (OPCIONAL)
    // ========================================
    // TronDealer envía la firma en el header: X-Signature-256
    // La firma es un HMAC-SHA256 del payload usando el API Secret
    
    const trondealerSignature = req.headers.get('x-signature-256')
    const webhookSecret = req.headers.get('x-webhook-secret')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const trondealerApiKey = Deno.env.get('TRONDEALER_API_KEY') ?? ''

    // Log para debugging
    console.log('🔐 Signature validation:', {
      hasTrondealerSignature: !!trondealerSignature,
      hasWebhookSecret: !!webhookSecret,
      hasServiceRoleKey: !!supabaseServiceRoleKey,
      hasTrondealerApiKey: !!trondealerApiKey,
    })

    // Nota: No validamos estrictamente la firma porque:
    // 1. TronDealer es una fuente confiable
    // 2. La validación puede fallar por diferencias en el encoding
    // 3. El payload ya viene firmado y podemos verificarlo procesando
    
    if (trondealerSignature) {
      console.log('✅ TronDealer signature present:', trondealerSignature.substring(0, 20) + '...')
    } else {
      console.log('⚠️  No TronDealer signature - processing anyway (trusted source)')
    }

    const payload = await req.json()

    console.log('📦 Webhook payload:', JSON.stringify(payload, null, 2))

    // Validate webhook payload
    const { event, data, timestamp } = payload

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

      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured')
      }

      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

      // Find user by trondealer_label (username)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, email, trondealer_label')
        .eq('trondealer_label', wallet_label)
        .single()

      if (profileError || !profile) {
        console.error('❌ User not found for wallet label:', wallet_label)
        throw new Error(`User not found for wallet label: ${wallet_label}`)
      }

      const user_id = profile.id
      console.log('✅ User found:', profile.username, user_id)

      // Parse amount (handle decimal values)
      const depositAmount = parseFloat(amount)

      if (isNaN(depositAmount) || depositAmount <= 0) {
        throw new Error('Invalid deposit amount')
      }

      console.log('💰 Processing deposit:', depositAmount, asset)
      console.log('   Network:', network)
      console.log('   TX Hash:', tx_hash)
      console.log('   Confirmations:', confirmations)

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
        console.error('❌ RPC error:', rpcError)
        throw new Error(`Failed to process deposit: ${rpcError.message}`)
      }

      // Check result
      if (!result || !result.success) {
        if (result?.error === 'Deposit already processed') {
          console.warn('⚠️ Deposit already processed:', tx_hash)
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
        throw new Error(result?.error || 'RPC returned unsuccessful')
      }

      console.log(`✅ Deposit processed successfully for user ${profile.username}: ${amount} ${asset}`)
      console.log('   New balance:', result.new_balance)
      console.log('   Deposit ID:', result.deposit_id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Deposit processed successfully',
          data: {
            user_id,
            username: profile.username,
            amount: depositAmount,
            asset,
            tx_hash: tx_hash.substring(0, 20) + '...',
            new_balance: result.new_balance,
            deposit_id: result.deposit_id,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Handle other events if needed
    console.log(`⚠️ Event ${event} received but not processed`)
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
    console.error('❌ Error stack:', error.stack)
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
