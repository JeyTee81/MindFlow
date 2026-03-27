import { Link, Outlet, useNavigate } from 'react-router-dom'
import { getDisplayLabel } from '../lib/displayName'
import { useAuthStore } from '../store/useAuthStore'

export default function AppLayout() {
  const navigate = useNavigate()
  const { session, signOut } = useAuthStore()
  const displayLabel = getDisplayLabel(session)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="flex min-h-0 min-h-[100dvh] w-full flex-1 flex-col bg-dark-blue">
      <header className="sticky top-0 z-40 shrink-0 border-b border-blue-500/20 bg-night-blue/90 px-3 py-3 backdrop-blur sm:px-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium sm:gap-6 sm:text-sm">
          <Link to="/" className="text-white hover:text-blue-300 transition-colors">
            Nouvelle mission
          </Link>
          <Link to="/missions" className="text-white hover:text-blue-300 transition-colors">
            Mes missions
          </Link>
          <Link to="/upgrade" className="text-amber-300/90 hover:text-amber-200 transition-colors">
            Premium
          </Link>
          <Link to="/profile" className="text-white hover:text-blue-300 transition-colors">
            Profil
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm text-gray-300">
          <Link
            to="/profile"
            className="hidden sm:inline max-w-[14rem] truncate hover:text-white transition-colors"
            title="Profil"
          >
            {displayLabel || 'Profil'}
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="px-3 py-1.5 rounded-md border border-blue-500/40 text-gray-200 hover:bg-blue-500/10 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-dark-blue [-webkit-overflow-scrolling:touch]">
        <Outlet />
      </main>
    </div>
  )
}
