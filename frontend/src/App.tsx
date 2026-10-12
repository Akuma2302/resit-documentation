import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { useAuth } from './lib/auth'
import { CapturePage } from './pages/CapturePage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { MyReceiptsPage } from './pages/MyReceiptsPage'
import { ReceiptDetailPage } from './pages/ReceiptDetailPage'
import { ReceiptsPage } from './pages/ReceiptsPage'
import { SettingsPage } from './pages/SettingsPage'

// These guards only decide what to show; the backend enforces access on every request.
function RequireUser() {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-6 text-sm text-slate-500">Loading…</p>
  return user ? <Shell /> : <Navigate to="/login" replace />
}

function RequireAdmin() {
  const { user } = useAuth()
  return user?.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireUser />}>
        <Route path="/" element={<MyReceiptsPage />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/receipts" element={<ReceiptsPage />} />
          <Route path="/admin/receipts/:id" element={<ReceiptDetailPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
