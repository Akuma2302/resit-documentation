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
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Resit Documentation</h1>
          <p className="text-sm text-slate-500">Log in to record receipts.</p>
        </div>
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
      </form>
    </main>
  )
}
