const rm = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatRM(cents: number) {
  return `${cents < 0 ? '-' : ''}RM ${rm.format(Math.abs(cents) / 100)}`
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2)
}

// For receipt dates, which are plain calendar days (YYYY-MM-DD)
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// For timestamps such as submitted or approved times, shown in the viewer's own timezone
export function formatDay(timestamp: string) {
  return new Date(timestamp).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

// "Staff (Ali)" when a staff member's name was recorded, otherwise just the payer
export function payerLabel(r: { payerName: string | null; paidByName: string }) {
  if (!r.payerName) return ''
  return r.paidByName ? `${r.payerName} (${r.paidByName})` : r.payerName
}

// "Company account", or "Personal account (Ali) · Maybank ••••1234"
// Lists only show the last four digits of a personal account number; the full number is on
// the receipt's own page and in the Excel export.
type AccountInfo = { paidFromAccount: string; accountHolder: string; accountBank: string; accountNumber: string }

export function accountLabel(r: AccountInfo) {
  if (r.paidFromAccount === 'COMPANY') return 'Company account'
  if (r.paidFromAccount !== 'PERSONAL') return ''
  const bank = [r.accountBank, r.accountNumber && `••••${r.accountNumber.slice(-4)}`].filter(Boolean).join(' ')
  return `Personal account${r.accountHolder ? ` (${r.accountHolder})` : ''}${bank ? ` · ${bank}` : ''}`
}

export const directionLabel = (direction: string) => (direction === 'IN' ? 'Sale' : 'Buy')

export const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
