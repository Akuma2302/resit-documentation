'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { login } from '../actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button className="btn w-full" disabled={pending}>
      {pending ? 'Logging in…' : 'Log in'}
    </button>
  )
}

export default function LoginPage() {
  const [state, action] = useFormState(login, {})
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <form action={action} className="panel w-full max-w-sm">
        <div className="bg-navy-800 px-5 py-4 text-white">
          <h1 className="text-lg font-extrabold tracking-wide">RESIT DOCS</h1>
          <p className="text-xs text-slate-300">Receipt Documentation System</p>
        </div>
        <div className="space-y-4 p-5">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        <Submit />
        </div>
      </form>
    </main>
  )
}
