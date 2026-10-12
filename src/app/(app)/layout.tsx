import { logout } from '../actions'
import { Shell, type NavLink } from '@/components/Shell'
import { requireUser } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const links: NavLink[] = [
    ...(session.role === 'ADMIN' ? [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }] : []),
    { href: '/', label: 'My Receipts', icon: 'receipts' },
    { href: '/capture', label: 'Camera', icon: 'camera' },
    ...(session.role === 'ADMIN'
      ? [
          { href: '/admin/receipts', label: 'Receipts', icon: 'list' },
          { href: '/admin/settings', label: 'Settings', icon: 'settings' },
        ]
      : []),
  ]
  return (
    <Shell
      links={links}
      userName={session.name}
      roleLabel={session.role === 'ADMIN' ? 'Admin' : 'Staff'}
      logout={logout}
    >
      {children}
    </Shell>
  )
}
