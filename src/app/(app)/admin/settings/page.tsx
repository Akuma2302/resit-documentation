import { toggleActive } from '@/app/actions'
import { PageHeader } from '@/components/PageHeader'
import { AddPayerForm, AddPurposeForm, AddUserForm, ResetPasswordForm } from '@/components/SettingsForms'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function Toggle({ kind, id, active }: { kind: string; id: number; active: boolean }) {
  return (
    <form action={toggleActive}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!active)} />
      <button className="link text-xs">{active ? 'Turn off' : 'Turn on'}</button>
    </form>
  )
}

export default async function SettingsPage() {
  const session = await requireAdmin()
  const [purposes, payers, users] = await Promise.all([
    db.purpose.findMany({ orderBy: [{ direction: 'asc' }, { id: 'asc' }] }),
    db.payer.findMany({ orderBy: { id: 'asc' } }),
    db.user.findMany({ orderBy: { id: 'asc' } }),
  ])
  const off = 'text-slate-400 line-through'

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" crumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Settings' }]} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3">
          <div>
            <h2 className="card-title mb-1">Purposes</h2>
            <p className="text-sm text-slate-500">What a receipt can be for. Shown in the camera form.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {purposes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={p.active ? '' : off}>{p.name}</span>
                <span className="ml-auto text-xs text-slate-500">{p.direction === 'IN' ? 'Money in' : 'Money out'}</span>
                <Toggle kind="purpose" id={p.id} active={p.active} />
              </li>
            ))}
          </ul>
          <AddPurposeForm />
        </section>

        <section className="card space-y-3">
          <div>
            <h2 className="card-title mb-1">Who paid</h2>
            <p className="text-sm text-slate-500">The choices in the &quot;Who paid&quot; dropdown for expenses.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {payers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className={p.active ? '' : off}>{p.name}</span>
                <Toggle kind="payer" id={p.id} active={p.active} />
              </li>
            ))}
          </ul>
          <AddPayerForm />
        </section>
      </div>

      <section className="card space-y-3">
        <div>
          <h2 className="card-title mb-1">Users</h2>
          <p className="text-sm text-slate-500">Each person logs in with their own account.</p>
        </div>
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className={u.active ? '' : off}>{u.name}</p>
                <p className="truncate text-xs text-slate-500">
                  {u.email} · {u.role === 'ADMIN' ? 'Admin' : 'User'}
                </p>
              </div>
              <ResetPasswordForm id={u.id} />
              {u.id !== session.userId && <Toggle kind="user" id={u.id} active={u.active} />}
            </li>
          ))}
        </ul>
        <AddUserForm />
      </section>
    </div>
  )
}
