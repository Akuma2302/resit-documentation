'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { addPayer, addPurpose, addUser, resetPassword, type FormState } from '@/app/actions'

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button className="btn" disabled={pending}>
      {label}
    </button>
  )
}

function Result({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>
  if (state.ok) return <p className="text-sm text-green-700">{state.ok}</p>
  return null
}

export function AddPurposeForm() {
  const [state, action] = useFormState(addPurpose, {})
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input className="input min-w-0 flex-1" name="name" placeholder="New purpose, e.g. Petrol" required />
        <select className="input w-auto" name="direction" defaultValue="OUT" aria-label="Direction">
          <option value="OUT">Money out</option>
          <option value="IN">Money in</option>
        </select>
        <Submit label="Add" />
      </div>
      <Result state={state} />
    </form>
  )
}

export function AddPayerForm() {
  const [state, action] = useFormState(addPayer, {})
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input className="input min-w-0 flex-1" name="name" placeholder="New payer, e.g. Manager" required />
        <Submit label="Add" />
      </div>
      <Result state={state} />
    </form>
  )
}

export function AddUserForm() {
  const [state, action] = useFormState(addUser, {})
  return (
    <form action={action} className="space-y-2">
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
      <Submit label="Add user" />
      <Result state={state} />
    </form>
  )
}

export function ResetPasswordForm({ id }: { id: number }) {
  const [state, action] = useFormState(resetPassword, {})
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="id" value={id} />
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
        <button className="btn-secondary">Set</button>
      </div>
      <Result state={state} />
    </form>
  )
}
