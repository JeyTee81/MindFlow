import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function RequireAuth() {
  const { userId, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-dark-blue flex items-center justify-center">
        <p className="text-white">Chargement…</p>
      </div>
    )
  }

  if (!userId) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="flex min-h-0 min-h-screen flex-1 flex-col">
      <Outlet />
    </div>
  )
}
