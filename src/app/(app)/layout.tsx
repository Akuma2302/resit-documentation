import Link from 'next/link'
import { logout } from '../actions'
import { requireUser } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()
  const links = [
    { href: '/', label: 'My receipts' },
    { href: '/capture', label: 'Camera' },
    ...(session.role === 'ADMIN'
      ? [
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/receipts', label: 'Receipts' },
          { href: '/admin/settings', label: 'Settings' },
        ]
      : []),
  ]
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-semibold">Resit</span>
          <nav className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-600 hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{session.name}</span>
            <button className="text-slate-600 underline hover:text-slate-900">Log out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
