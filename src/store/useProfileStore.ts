import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

export type Profile = {
  subscription_tier: 'free' | 'premium'
  ai_runs_used: number
  /** Mois UTC `YYYY-MM` pour lequel `ai_runs_used` est valide (aligné create-mission). */
  ai_quota_month: string | null
}

type ProfileState = {
  profile: Profile | null
  loadProfile: () => Promise<void>
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loadProfile: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      set({ profile: null })
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, ai_runs_used, ai_quota_month')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !data) {
      set({ profile: null })
      return
    }
    set({
      profile: {
        subscription_tier: data.subscription_tier as Profile['subscription_tier'],
        ai_runs_used: data.ai_runs_used ?? 0,
        ai_quota_month: (data as { ai_quota_month?: string | null }).ai_quota_month ?? null,
      },
    })
  },
}))
