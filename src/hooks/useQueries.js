import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// ==================== AUTH ====================
export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session
    },
    staleTime: Infinity,
    retry: false,
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password, referralCode }) => {
      // 1. Buscar sponsor si hay referral code
      let sponsorId = null
      if (referralCode && referralCode.trim() !== '') {
        const { data: sponsorData } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referralCode.toUpperCase().trim())
          .maybeSingle()
        
        if (sponsorData) {
          sponsorId = sponsorData.id
        }
      }
      
      // 2. Registrar usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (authError) throw authError
      
      // 3. Crear perfil usando RPC
      const { error: profileError } = await supabase.rpc('create_user_profile', {
        p_user_id: authData.user.id,
        p_username: email.split('@')[0],
        p_email: email,
        p_sponsor_id: sponsorId,
        p_referral_code: null,
      })
      
      if (profileError) throw profileError
      
      return authData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

// ==================== PROFILE ====================
export function useProfile(userId) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: 1,
  })
}

export function useValidateReferralCode() {
  return useMutation({
    mutationFn: async (referralCode) => {
      if (!referralCode || referralCode.trim() === '') {
        return null
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, referral_code')
        .eq('referral_code', referralCode.toUpperCase().trim())
        .maybeSingle()
      
      if (error) throw error
      return data
    },
  })
}

// ==================== WALLET ====================
export function useWallet(userId) {
  return useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 segundos
    retry: 1,
  })
}

// ==================== DASHBOARD SUMMARY ====================
export function useDashboardSummary(userId) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) return null
      
      const { data, error } = await supabase
        .rpc('get_user_dashboard_summary', { p_user_id: userId })
        .single()
      
      if (error) {
        console.error('Error en dashboard summary:', error)
        throw error
      }
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 1,
  })
}

// ==================== REFERRALS ====================
export function useReferralsTree(userId) {
  return useQuery({
    queryKey: ['referrals', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .rpc('get_referrals_tree_recursive', { p_user_id: userId })

      if (error) {
        console.error('Error en useReferralsTree:', error)
        return []
      }
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 1,
  })
}

// ==================== TRANSACTIONS ====================
export function useTransactions(userId, limit = 100) {
  return useQuery({
    queryKey: ['transactions', userId, limit],
    queryFn: async () => {
      if (!userId) return []
      
      const { data, error } = await supabase
        .rpc('get_user_transactions', { p_user_id: userId, p_limit: limit })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 segundos
    retry: 1,
  })
}

export function useCommissions(userId) {
  return useQuery({
    queryKey: ['commissions', userId],
    queryFn: async () => {
      if (!userId) return []
      
      const { data, error } = await supabase
        .from('mlm_commissions')
        .select(`
          *,
          from_profile:from_user_id (
            username,
            email
          )
        `)
        .eq('user_id', userId)
        .eq('is_paid', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minuto
    retry: 1,
  })
}

// ==================== DEPOSITS ====================
export function useCreateDeposit() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, amount }) => {
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          currency: 'USD',
          status: 'completed',
          payment_method: 'simulado',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidar todas las consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['referrals'] })
      // Invalidar específicamente para este usuario
      queryClient.invalidateQueries({ queryKey: ['wallet', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.userId] })
    },
  })
}

// ==================== WITHDRAWALS ====================
export function useCreateWithdrawal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, amount, walletAddress }) => {
      const { data, error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          wallet_address: walletAddress,
          status: 'pending',
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wallet', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.userId] })
    },
  })
}

// ==================== TRANSFERS ====================
export function useTransferInternal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, amount, type }) => {
      // Obtener wallet actual
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (!walletData) throw new Error('Wallet no encontrada')
      
      if (type === 'to_invested' && amount > walletData.balance_disponible) {
        throw new Error('Saldo disponible insuficiente')
      }
      
      if (type === 'from_invested' && amount > walletData.balance_invertido) {
        throw new Error('Saldo invertido insuficiente')
      }
      
      // Insertar transferencia
      const { error: transferError } = await supabase
        .from('transfers_internas')
        .insert({
          user_id: userId,
          amount: parseFloat(amount),
          type,
          from_wallet: type === 'to_invested' ? 'disponible' : 'invertido',
          to_wallet: type === 'to_invested' ? 'invertido' : 'disponible',
          description: type === 'to_invested' 
            ? 'Transferencia a inversión' 
            : 'Retiro de inversión',
        })
      
      if (transferError) throw transferError
      
      // Actualizar wallet
      const updateData = type === 'to_invested'
        ? {
            balance_disponible: walletData.balance_disponible - amount,
            balance_invertido: walletData.balance_invertido + amount,
          }
        : {
            balance_disponible: walletData.balance_disponible + amount,
            balance_invertido: walletData.balance_invertido - amount,
          }
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update(updateData)
        .eq('user_id', userId)
      
      if (updateError) throw updateError
      
      return { success: true }
    },
    onSuccess: (_, variables) => {
      // Invalidar wallet y dashboard específicamente para este usuario
      queryClient.invalidateQueries({ queryKey: ['wallet', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', variables.userId] })
    },
  })
}
