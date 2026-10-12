import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, LOGOUT_EVENT, setToken } from './api'
import type { User } from './types'

type AuthState = {
  user: User | null
  // true while the saved token is being checked on first load
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const SKIP_AUTO_LOGIN = 'resit_skip_auto_login'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // the dev server may be able to skip the login page, so it also starts in the loading state
  const [loading, setLoading] = useState(Boolean(getToken()) || import.meta.env.DEV)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (getToken()) {
        const res = await api<{ user: User }>('/api/auth/me').catch(() => null)
        if (res) return res.user
      }
      // Development only: the backend logs us in as admin when DEV_AUTO_LOGIN is on.
      // This branch is removed from production builds.
      if (import.meta.env.DEV && !sessionStorage.getItem(SKIP_AUTO_LOGIN)) {
        const res = await api<{ token: string; user: User }>('/api/auth/dev-login', { method: 'POST' }).catch(() => null)
        if (res) {
          setToken(res.token)
          return res.user
        }
      }
      return null
    }
    restore().then((restored) => {
      if (cancelled) return
      setUser(restored)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // api.ts fires this when the backend rejects the token
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', json: { email, password } })
    setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    // stay logged out until the tab is closed, so the login page can still be seen in development
    sessionStorage.setItem(SKIP_AUTO_LOGIN, '1')
    setToken(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
