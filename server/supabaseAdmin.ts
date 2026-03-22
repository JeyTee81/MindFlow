import { createClient, SupabaseClient } from '@supabase/supabase-js'

let admin: SupabaseClient | undefined
let anon: SupabaseClient | undefined

function requireUrl(): string {
  const url = process.env.SUPABASE_URL
  if (!url) {
    throw new Error(
      'Missing SUPABASE_URL (ou VITE_SUPABASE_URL dans .env.local).'
    )
  }
  return url
}

/** Client service_role — utilisé par les routes /api si tu les actives. */
export function getSupabaseAdmin(): SupabaseClient {
  const url = requireUrl()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY dans .env (requis pour le backend Express /api).'
    )
  }
  if (!admin) admin = createClient(url, key)
  return admin
}

/** Client anon — vérif JWT utilisateur. */
export function getSupabaseAnon(): SupabaseClient {
  const url = requireUrl()
  const key = process.env.SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      'Missing SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY dans .env.local).'
    )
  }
  if (!anon) anon = createClient(url, key)
  return anon
}
