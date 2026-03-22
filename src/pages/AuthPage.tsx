import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import Auth from './Auth'

export default function AuthPage() {
  const { userId, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-dark-blue flex items-center justify-center">
        <p className="text-white">Chargement…</p>
      </div>
    )
  }

  if (userId) {
    return <Navigate to="/" replace />
  }

  return <Auth />
}
