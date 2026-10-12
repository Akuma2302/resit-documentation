const rm = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatRM(cents: number) {
  return `${cents < 0 ? '-' : ''}RM ${rm.format(Math.abs(cents) / 100)}`
}

// "12.50" or "1,234.5" -> 1250 / 123450. Returns null when not a valid positive amount.
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const cents = Math.round(parseFloat(cleaned) * 100)
  return cents > 0 ? cents : null
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2)
}

// Receipt dates are stored as UTC midnight so they never shift by timezone.
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return isNaN(date.getTime()) ? null : date
}

export function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const directionLabel = (direction: string) => (direction === 'IN' ? 'Sale' : 'Buy')

export const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
