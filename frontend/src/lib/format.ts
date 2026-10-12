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

export const directionLabel = (direction: string) => (direction === 'IN' ? 'Sale' : 'Buy')

export const statusLabel: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}
