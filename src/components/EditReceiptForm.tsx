'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { updateReceipt } from '@/app/actions'
import { ReceiptFields, type Option, type PurposeOption, type ReceiptValues } from './ReceiptFields'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button className="btn" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  )
}

type Props = { id: number; initial: ReceiptValues; purposes: PurposeOption[]; payers: Option[] }

export function EditReceiptForm({ id, initial, purposes, payers }: Props) {
  const [values, setValues] = useState(initial)
  const [state, action] = useFormState(updateReceipt, {})
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <ReceiptFields purposes={purposes} payers={payers} values={values} onChange={setValues} />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
      <Submit />
    </form>
  )
}
