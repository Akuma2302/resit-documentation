const rm = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatRM(cents) {
  return `${cents < 0 ? '-' : ''}RM ${rm.format(Math.abs(cents) / 100)}`
}

// "12.50" or "1,234.5" -> 1250 / 123450. Returns null when not a valid positive amount.
function parseAmountToCents(input) {
  const cleaned = String(input ?? '').replace(/[^0-9.]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const cents = Math.round(parseFloat(cleaned) * 100)
  return cents > 0 ? cents : null
}

// Receipt dates are stored as UTC midnight so they never shift by timezone.
function parseDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return isNaN(date.getTime()) ? null : date
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10)
}

function formatDate(date) {
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const directionLabel = (direction) => (direction === 'IN' ? 'Sale' : 'Buy')

const statusLabel = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }

module.exports = { formatRM, parseAmountToCents, parseDateInput, toDateInput, formatDate, directionLabel, statusLabel }
