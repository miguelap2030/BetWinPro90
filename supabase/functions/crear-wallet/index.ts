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
