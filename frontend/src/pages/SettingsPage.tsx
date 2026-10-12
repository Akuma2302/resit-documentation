import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { Option, PurposeOption, User } from '@/lib/types'
import { useApi } from '@/lib/useApi'

type Settings = {
  purposes: (PurposeOption & { active: boolean })[]
  payers: (Option & { active: boolean })[]
  users: (User & { active: boolean })[]
}

type Result = { ok?: string; error?: string }

// Posts a small settings form, shows the outcome, and reloads the lists on success.
function useSubmit(path: string, onDone: () => void) {
  const [result, setResult] = useState<Result>({})
  const [pending, setPending] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setPending(true)
    try {
      const res = await api<{ ok: string }>(path, { method: 'POST', json: Object.fromEntries(new FormData(form)) })
      setResult({ ok: res.ok })
      form.reset()
      onDone()
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Something went wrong.' })
    }
    setPending(false)
  }
  return { submit, pending, result }
}

function ResultLine({ result }: { result: Result }) {
  if (result.error) return <p className="text-sm text-red-700">{result.error}</p>
  if (result.ok) return <p className="text-sm text-green-700">{result.ok}</p>
  return null
}

function AddPurposeForm({ onDone }: { onDone: () => void }) {
  const { submit, pending, result } = useSubmit('/api/admin/purposes', onDone)
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" name="name" placeholder="New purpose, e.g. Petrol" required />
        <select className="input w-auto" name="direction" defaultValue="OUT" aria-label="Direction">
          <option value="OUT">Money out</option>
          <option value="IN">Money in</option>
        </select>
        <button className="btn" disabled={pending}>
          Add
        </button>
      </div>
      <ResultLine result={result} />
    </form>
  )
}

function AddPayerForm({ onDone }: { onDone: () => void }) {
  const { submit, pending, result } = useSubmit('/api/admin/payers', onDone)
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1" name="name" placeholder="New payer, e.g. Manager" required />
        <button className="btn" disabled={pending}>
          Add
        </button>
      </div>
      <ResultLine result={result} />
    </form>
  )
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const { submit, pending, result } = useSubmit('/api/admin/users', onDone)
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" name="name" placeholder="Name" required />
        <input className="input" name="email" type="email" placeholder="Email" required />
        <input
          className="input"
          name="password"
          type="password"
          placeholder="Password (8+ characters)"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <select className="input" name="role" defaultValue="USER" aria-label="Role">
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <button className="btn" disabled={pending}>
        Add user
      </button>
      <ResultLine result={result} />
    </form>
  )
}

function ResetPasswordForm({ id }: { id: string }) {
  const { submit, pending, result } = useSubmit(`/api/admin/users/${id}/password`, () => {})
  return (
    <form onSubmit={submit} className="space-y-1">
      <div className="flex gap-2">
        <input
          className="input w-44"
          name="password"
          type="password"
          placeholder="New password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <button className="btn-secondary" disabled={pending}>
          Set
        </button>
      </div>
      <ResultLine result={result} />
    </form>
  )
}

const off = 'text-slate-400 line-through'

export function SettingsPage() {
  const { user: me } = useAuth()
  const { data, error, reload } = useApi<Settings>('/api/admin/settings')
  const [toggleError, setToggleError] = useState('')

  const toggle = (kind: string, id: string, active: boolean) => {
    setToggleError('')
    api('/api/admin/toggle', { method: 'POST', json: { kind, id, active } })
      .then(reload)
      .catch((e: Error) => setToggleError(e.message))
  }
  const Toggle = ({ kind, id, active }: { kind: string; id: string; active: boolean }) => (
    <button type="button" className="link text-xs" onClick={() => toggle(kind, id, !active)}>
      {active ? 'Turn off' : 'Turn on'}
    </button>
  )

  const header = <PageHeader title="Settings" crumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Settings' }]} />
  if (error) {
    return (
      <div>
        {header}
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="space-y-4">
      {header}
      {toggleError && <p className="text-sm text-red-700">{toggleError}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3">
          <div>
            <h2 className="card-title mb-1">Purposes</h2>
            <p className="text-sm text-slate-500">What a receipt can be for. Shown in the camera form.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.purposes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={p.active ? '' : off}>{p.name}</span>
                <span className="ml-auto text-xs text-slate-500">{p.direction === 'IN' ? 'Money in' : 'Money out'}</span>
                <Toggle kind="purpose" id={p.id} active={p.active} />
              </li>
            ))}
          </ul>
          <AddPurposeForm onDone={reload} />
        </section>

        <section className="card space-y-3">
          <div>
            <h2 className="card-title mb-1">Who paid</h2>
            <p className="text-sm text-slate-500">The choices in the &quot;Who paid&quot; dropdown for expenses.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.payers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={p.active ? '' : off}>{p.name}</span>
                <Toggle kind="payer" id={p.id} active={p.active} />
              </li>
            ))}
          </ul>
          <AddPayerForm onDone={reload} />
        </section>
      </div>

      <section className="card space-y-3">
        <div>
          <h2 className="card-title mb-1">Users</h2>
          <p className="text-sm text-slate-500">Each person logs in with their own account.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className={u.active ? '' : off}>{u.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {u.email} · {u.role === 'ADMIN' ? 'Admin' : 'User'}
                </p>
              </div>
              <ResetPasswordForm id={u.id} />
              {u.id !== me?.id && <Toggle kind="user" id={u.id} active={u.active} />}
            </li>
          ))}
        </ul>
        <AddUserForm onDone={reload} />
      </section>
    </div>
  )
}
