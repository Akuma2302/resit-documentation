import type { Option, PurposeOption } from '@/lib/types'

export type ReceiptValues = {
  amount: string
  date: string
  purposeId: string
  payerId: string
  paidByName: string
  counterparty: string
  note: string
}

type Props = {
  purposes: PurposeOption[]
  payers: Option[]
  values: ReceiptValues
  onChange: (values: ReceiptValues) => void
}

// The fields shared by the capture form and the admin edit form.
export function ReceiptFields({ purposes, payers, values, onChange }: Props) {
  const set = (patch: Partial<ReceiptValues>) => onChange({ ...values, ...patch })
  const purpose = purposes.find((p) => String(p.id) === values.purposeId)
  const isExpense = purpose?.direction === 'OUT'
  // "Staff" covers many people, so ask which one (the backend applies the same rule)
  const payer = payers.find((p) => String(p.id) === values.payerId)
  const askStaffName = isExpense && payer !== undefined && /staff/i.test(payer.name)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="amount">
            Price (RM)
          </label>
          <input
            className="input"
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="date">
            Receipt date
          </label>
          <input
            className="input"
            id="date"
            name="date"
            type="date"
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="purposeId">
          Purpose
        </label>
        <select
          className="input"
          id="purposeId"
          name="purposeId"
          value={values.purposeId}
          onChange={(e) => set({ purposeId: e.target.value })}
          required
        >
          <option value="">Choose what this receipt is for</option>
          <optgroup label="Money in">
            {purposes.filter((p) => p.direction === 'IN').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Money out">
            {purposes.filter((p) => p.direction === 'OUT').map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {isExpense && (
        <div>
          <label className="label" htmlFor="payerId">
            Who paid
          </label>
          <select
            className="input"
            id="payerId"
            name="payerId"
            value={values.payerId}
            onChange={(e) => set({ payerId: e.target.value })}
            required
          >
            <option value="">Choose who paid</option>
            {payers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {askStaffName && (
        <div>
          <label className="label" htmlFor="paidByName">
            Staff name
          </label>
          <input
            className="input"
            id="paidByName"
            name="paidByName"
            placeholder="Who paid for this"
            autoComplete="name"
            autoCapitalize="words"
            value={values.paidByName}
            onChange={(e) => set({ paidByName: e.target.value })}
            maxLength={80}
            required
          />
        </div>
      )}

      {purpose && (
        <div>
          <label className="label" htmlFor="counterparty">
            {isExpense ? 'Paid to' : 'Received from'}
          </label>
          <input
            className="input"
            id="counterparty"
            name="counterparty"
            placeholder={isExpense ? 'Shop, supplier or person' : 'Customer'}
            value={values.counterparty}
            onChange={(e) => set({ counterparty: e.target.value })}
            maxLength={120}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="note">
          Note (optional)
        </label>
        <textarea
          className="input"
          id="note"
          name="note"
          rows={2}
          value={values.note}
          onChange={(e) => set({ note: e.target.value })}
          maxLength={1000}
        />
      </div>
    </div>
  )
}
