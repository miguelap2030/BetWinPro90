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

    // TronDealer API configuration
    const TRONDEALER_API_KEY = Deno.env.get('TRONDEALER_API_KEY')
    const TRONDEALER_BASE_URL = 'https://trondealer.com/api/v2'

    if (!TRONDEALER_API_KEY) {
      throw new Error('TRONDEALER_API_KEY not configured')
    }

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
      throw new Error(`TronDealer API error: ${errorData}`)
    }

    const trondealerData = await trondealerResponse.json()

    if (!trondealerData.success || !trondealerData.wallet) {
      throw new Error('Failed to create wallet in TronDealer')
    }

    const { id: trondealer_wallet_id, address, label } = trondealerData.wallet

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Update user's profile with TronDealer wallet info
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({
        trondealer_wallet_id,
        trondealer_address: address,
        trondealer_label: label,
      })
      .eq('id', user_id)
      .select()
      .single()

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`)
    }

    // Create or update wallet record in database
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .upsert({
        user_id,
        trondealer_wallet_id,
        trondealer_address: address,
        disponible: 0,
        invertido: 0,
        comisiones: 0,
        retirado: 0,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (walletError) {
      throw new Error(`Failed to create wallet: ${walletError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        wallet: {
          id: walletData.id,
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
