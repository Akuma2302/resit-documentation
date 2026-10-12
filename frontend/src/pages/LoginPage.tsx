import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!loading && user) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError('')
    try {
      const loggedIn = await login(email, password)
      navigate(loggedIn.role === 'ADMIN' ? '/admin' : '/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log in.')
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <form onSubmit={submit} className="panel w-full max-w-sm">
        <div className="bg-navy-800 px-5 py-4 text-white">
          <h1 className="text-lg font-extrabold tracking-wide">RESIT DOCS</h1>
          <p className="text-xs text-slate-300">Receipt Documentation System</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn w-full" disabled={pending}>
            {pending ? 'Logging in…' : 'Log in'}
          </button>
        </div>
      </form>
    </main>
  )
}
