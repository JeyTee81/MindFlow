import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import AppLayout from './layouts/AppLayout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import MissionList from './pages/MissionList'
import Profile from './pages/Profile'
import Upgrade from './pages/Upgrade'

export default function App() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="missions" element={<MissionList />} />
          <Route path="mission/:missionId" element={<Dashboard />} />
          <Route path="upgrade" element={<Upgrade />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </div>
  )
}
