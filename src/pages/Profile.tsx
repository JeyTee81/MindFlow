import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { getDisplayLabel } from '../lib/displayName'
import { useAuthStore } from '../store/useAuthStore'
import { useProfileStore } from '../store/useProfileStore'

export default function Profile() {
  const { session } = useAuthStore()
  const { profile, loadProfile } = useProfileStore()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const meta = session?.user?.user_metadata as { display_name?: string } | undefined
    setName(meta?.display_name?.trim() ?? getDisplayLabel(session))
  }, [session])

  const email = session?.user?.email ?? ''

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSaving(true)
    try {
      const trimmed = name.trim()
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: trimmed || null },
      })
      if (error) throw error
      setMessage('Profil enregistré.')
      if (data.user) {
        useAuthStore.setState((s) =>
          s.session
            ? { session: { ...s.session, user: data.user } }
            : {}
        )
      }
    } catch (err) {
      setMessage((err as Error).message || 'Erreur à l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 p-8 max-w-lg mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Profil</h1>
        <p className="text-gray-400 text-sm mb-8">
          Ce nom est affiché dans l’en-tête à la place de l’identifiant technique.
        </p>

        <div className="rounded-lg border border-blue-500/20 bg-night-blue/50 p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-200 truncate" title={email}>
              {email || '—'}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">Plan</span>
            <span className={profile?.subscription_tier === 'premium' ? 'text-amber-200' : 'text-gray-200'}>
              {profile?.subscription_tier === 'premium' ? 'Premium' : 'Gratuit'}
            </span>
          </div>
          {profile?.subscription_tier === 'free' && (
            <p className="text-xs text-gray-500 pt-2">
              Pour passer en Premium :{' '}
              <Link to="/upgrade" className="text-blue-300 underline">
                voir les options
              </Link>
              .
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm text-gray-400 mb-1">
              Nom affiché
            </label>
            <input
              id="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom ou pseudo"
              className="w-full px-4 py-2 rounded-lg bg-night-blue border border-blue-500/30 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              maxLength={80}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="px-4 py-2 rounded-lg border border-blue-500/40 text-gray-300 text-sm hover:bg-blue-500/10"
            >
              Rafraîchir le plan
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
      </motion.div>
    </div>
  )
}
