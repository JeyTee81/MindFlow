import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { useProfileStore } from './useProfileStore'

type AuthState = {
  isLoading: boolean
  session: Session | null
  userId: string | null
  accessToken: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>(() => ({
  isLoading: true,
  session: null,
  userId: null,
  accessToken: null,

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const needsConfirmation = !data.session
    return { needsConfirmation }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    useProfileStore.setState({ profile: null })
  },
}))

// Init + subscription outside the store definition (so we can run once).
;(async () => {
  const { data } = await supabase.auth.getSession()
  useAuthStore.setState({
    isLoading: false,
    session: data.session,
    userId: data.session?.user?.id ?? null,
    accessToken: data.session?.access_token ?? null,
  })
  void useProfileStore.getState().loadProfile()

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({
      session,
      userId: session?.user?.id ?? null,
      accessToken: session?.access_token ?? null,
    })
    void useProfileStore.getState().loadProfile()
  })
})()

