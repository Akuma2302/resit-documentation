import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Icon } from './Icon'

type NavLink = { href: string; label: string; icon: string }

function isActive(pathname: string, href: string) {
  // "/" and "/admin" are parents of other pages, so they only match exactly
  return href === '/' || href === '/admin' ? pathname === href : pathname.startsWith(href)
}

function currentTime() {
  return new Date().toLocaleString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// The navy frame around every logged-in page: a sidebar on desktop and a bottom tab bar on
// phones. The env(safe-area-inset-*) paddings keep it clear of the notch and home indicator.
export function Shell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [now, setNow] = useState(currentTime)

  useEffect(() => {
    const timer = setInterval(() => setNow(currentTime()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // each page starts at the top, as a native app screen would
  // (braces matter: newer browsers return a promise from scrollTo, which must not be returned here)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const isAdmin = user?.role === 'ADMIN'
  const links: NavLink[] = [
    ...(isAdmin ? [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }] : []),
    { href: '/', label: 'My Receipts', icon: 'receipts' },
    { href: '/capture', label: 'Camera', icon: 'camera' },
    ...(isAdmin
      ? [
          { href: '/admin/receipts', label: 'Receipts', icon: 'list' },
          { href: '/admin/settings', label: 'Settings', icon: 'settings' },
        ]
      : []),
  ]

  return (
    <div className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-30 bg-navy-900 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] text-white">
        <div className="flex h-12 items-center gap-3 px-3">
          <span className="text-base font-extrabold tracking-wide">RESIT DOCS</span>
          <span className="hidden text-xs text-slate-300 sm:inline">Receipt Documentation System</span>
          <span className="ml-auto hidden text-xs text-slate-200 lg:inline">{now}</span>
          <div className="ml-auto flex items-center gap-2 lg:ml-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
              <Icon name="user" />
            </span>
            <span className="leading-tight">
              <span className="block max-w-[8rem] truncate text-xs font-semibold">{user?.name}</span>
              <span className="block text-[11px] text-slate-300">{isAdmin ? 'Admin' : 'Staff'}</span>
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label="Logout"
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 active:bg-white/20 md:hidden"
            >
              <Icon name="logout" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[calc(3rem+env(safe-area-inset-top))] z-20 hidden w-52 flex-col bg-navy-800 text-slate-100 md:flex">
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${
                isActive(pathname, link.href) ? 'bg-brand-600 text-white' : 'hover:bg-white/10'
              }`}
            >
              <Icon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-white/10"
          >
            <Icon name="logout" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[calc(3rem+env(safe-area-inset-top))] md:pb-0 md:pl-52">
        <main className="flex-1 p-3 sm:p-4">
          <Outlet />
        </main>
        <footer className="px-4 pb-3 text-center text-xs text-slate-500">
          This system is for authorized users only. All receipts are logged.
        </footer>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-navy-800 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-slate-200 md:hidden"
      >
        {links.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              to={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold active:bg-white/10 ${
                active ? 'text-white' : 'text-slate-300'
              }`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? 'bg-brand-600' : ''}`}>
                <Icon name={link.icon} className="h-5 w-5" />
              </span>
              <span className="max-w-full truncate px-1">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
