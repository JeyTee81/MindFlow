import type { Session } from '@supabase/supabase-js'

/** Nom affiché : display_name / full_name (metadata), sinon partie locale de l’email. */
export function getDisplayLabel(session: Session | null | undefined): string {
  if (!session?.user) return ''
  const meta = session.user.user_metadata as {
    display_name?: string
    full_name?: string
  }
  const name = meta.display_name?.trim() || meta.full_name?.trim()
  if (name) return name
  const email = session.user.email
  if (email) return email.split('@')[0] ?? 'Compte'
  return 'Compte'
}
