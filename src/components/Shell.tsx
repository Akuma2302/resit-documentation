'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'

export type NavLink = { href: string; label: string; icon: string }

type Props = {
  links: NavLink[]
  userName: string
  roleLabel: string
  logout: () => Promise<void>
  children: React.ReactNode
}

function isActive(pathname: string, href: string) {
  // "/" and "/admin" are parents of other pages, so they only match exactly
  return href === '/' || href === '/admin' ? pathname === href : pathname.startsWith(href)
}

export function Shell({ links, userName, roleLabel, logout, children }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState('')

  useEffect(() => setOpen(false), [pathname])

  // The clock is filled in after mount so server and browser markup match
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleString('en-MY', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      )
    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center gap-3 bg-navy-900 px-3 text-white">
        <button
          type="button"
          className="rounded p-1.5 hover:bg-white/10 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>
        <span className="text-base font-extrabold tracking-wide">RESIT DOCS</span>
        <span className="hidden text-xs text-slate-300 sm:inline">Receipt Documentation System</span>
        <span className="ml-auto hidden text-xs text-slate-200 lg:inline">{now}</span>
        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Icon name="user" />
          </span>
          <span className="leading-tight">
            <span className="block max-w-[9rem] truncate text-xs font-semibold">{userName}</span>
            <span className="block text-[11px] text-slate-300">{roleLabel}</span>
          </span>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-10 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed bottom-0 left-0 top-12 z-20 flex w-52 flex-col bg-navy-800 text-slate-100 transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${
                isActive(pathname, link.href) ? 'bg-brand-600 text-white' : 'hover:bg-white/10'
              }`}
            >
              <Icon name={link.icon} />
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="border-t border-white/10 p-2">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-white/10">
            <Icon name="logout" />
            Logout
          </button>
        </form>
      </aside>

      <div className="flex min-h-screen flex-col pt-12 md:pl-52">
        <main className="flex-1 p-4">{children}</main>
        <footer className="px-4 pb-3 text-center text-xs text-slate-500">
          This system is for authorized users only. All receipts are logged.
        </footer>
      </div>
    </div>
  )
}
