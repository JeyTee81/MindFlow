/** URL et clé anon sans espaces / retours ligne (cause fréquente de 401). */
function trimEnv(name: string): string {
  const v = import.meta.env[name] as string | undefined
  if (v == null || String(v).trim() === '') {
    throw new Error(`Missing ${name} env var`)
  }
  return String(v).trim()
}

export const supabaseUrl = trimEnv('VITE_SUPABASE_URL')
export const supabaseAnonKey = trimEnv('VITE_SUPABASE_ANON_KEY')
