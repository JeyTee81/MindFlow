import { supabase } from './supabaseClient'
import { supabaseAnonKey, supabaseUrl } from './supabaseEnv'

function parseApiErrorBody(text: string, parsed: unknown): string {
  if (typeof parsed === 'object' && parsed !== null) {
    const o = parsed as { message?: string; error?: string; code?: number }
    if (o.error === 'RATE_LIMIT' && o.message && typeof o.message === 'string') {
      return o.message
    }
    if (o.message && typeof o.message === 'string') return o.message
    if (o.error && typeof o.error === 'string') return o.error
  }
  if (text.trim()) return text.slice(0, 500)
  return 'Erreur HTTP'
}

async function getAccessToken(): Promise<string> {
  const { error: userError } = await supabase.auth.getUser()
  if (userError) {
    const { data, error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr || !data.session?.access_token) {
      throw new Error(
        'Session invalide ou expirée : déconnecte-toi puis reconnecte-toi (vérifie aussi que l’URL et la clé anon du même projet Supabase sont dans .env.local).'
      )
    }
    return data.session.access_token
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error

  if (!session?.access_token) {
    const { data, error: refreshErr } = await supabase.auth.refreshSession()
    if (refreshErr || !data.session?.access_token) {
      throw new Error('Non connecté : reconnecte-toi.')
    }
    return data.session.access_token
  }

  const expiresAt = session.expires_at
  if (expiresAt && expiresAt * 1000 < Date.now() + 120_000) {
    const { data, error: refreshErr } = await supabase.auth.refreshSession()
    if (!refreshErr && data.session?.access_token) {
      return data.session.access_token
    }
  }

  return session.access_token
}

export async function invokeEdgeFunctionJson<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken()
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${name}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    parsed = undefined
  }

  if (!res.ok) {
    throw new Error(parseApiErrorBody(text, parsed) || `HTTP ${res.status}`)
  }

  return parsed as T
}

export async function invokeEdgeFunctionVoid(
  name: string,
  body: Record<string, unknown>
): Promise<void> {
  const token = await getAccessToken()
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${name}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    let parsed: unknown
    try {
      parsed = text ? JSON.parse(text) : undefined
    } catch {
      parsed = undefined
    }
    throw new Error(parseApiErrorBody(text, parsed) || `HTTP ${res.status}`)
  }
}
