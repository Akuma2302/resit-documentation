// Pulls the total, date and vendor out of raw OCR text from a receipt.
// Everything here is a best guess; the form lets the user correct it.

export type ScanResult = { amount: string; date: string; vendor: string }

const AMOUNT = /(\d{1,3}(?:[,\s]\d{3})+|\d+)\s?[.,]\s?(\d{2})(?!\d)/g
const TOTAL_WORDS = /\b(grand\s*total|total|jumlah|amount\s*due|nett?|amaun)\b/i
const NOT_TOTAL = /\b(sub\s*-?total|cash|tunai|change|baki|discount|diskaun|rounding|qty|item)/i

function amountsIn(line: string): number[] {
  const found: number[] = []
  for (const m of line.matchAll(AMOUNT)) {
    const value = parseFloat(`${m[1].replace(/[,\s]/g, '')}.${m[2]}`)
    if (value > 0 && value < 1_000_000) found.push(value)
  }
  return found
}

// Amounts marked with the currency, before or after the number: "RM 12.50", "MYR12", "45.00 MYR".
// Unlike plain amounts these may have no decimals, since the currency mark shows it is money.
const CURRENCY = String.raw`R\s?M|MYR`
const NUMBER = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\s?[.,]\s?(\d{1,2}))?(?![\d.,]*\d)`
const CURRENCY_BEFORE = new RegExp(String.raw`(?:^|[^A-Za-z])(?:${CURRENCY})\s*[:.]?\s*${NUMBER}`, 'gi')
const CURRENCY_AFTER = new RegExp(String.raw`${NUMBER}\s*(?:${CURRENCY})(?![A-Za-z])`, 'gi')

function currencyAmountsIn(line: string): number[] {
  const found: number[] = []
  for (const pattern of [CURRENCY_BEFORE, CURRENCY_AFTER]) {
    for (const m of line.matchAll(pattern)) {
      const value = parseFloat(`${m[1].replace(/,/g, '')}.${(m[2] ?? '0').padEnd(2, '0')}`)
      if (value > 0 && value < 1_000_000) found.push(value)
    }
  }
  return found
}

// On a line, an amount marked RM/MYR is trusted over unmarked numbers
const moneyIn = (line: string) => {
  const marked = currencyAmountsIn(line)
  return marked.length ? marked : amountsIn(line)
}

const PAYMENT_LINE = /\b(cash|tunai|change|baki|tendered|paid)\b/i

function findAmount(lines: string[]): string {
  let best: number | null = null
  let bestRank = -1
  lines.forEach((line, i) => {
    if (!TOTAL_WORDS.test(line) || NOT_TOTAL.test(line)) return
    // the amount is sometimes printed on the line under the word "Total"
    const values = moneyIn(line).length ? moneyIn(line) : moneyIn(lines[i + 1] ?? '')
    if (!values.length) return
    const rank = /grand\s*total/i.test(line) ? 2 : 1
    const value = Math.max(...values)
    if (rank > bestRank || (rank === bestRank && value > (best ?? 0))) {
      best = value
      bestRank = rank
    }
  })
  const candidates = lines.filter((l) => !PAYMENT_LINE.test(l) && !NOT_TOTAL.test(l))
  if (best === null) {
    // no labelled total: an amount marked RM or MYR is the price
    const marked = candidates.flatMap(currencyAmountsIn)
    if (marked.length) best = Math.max(...marked)
  }
  if (best === null) {
    // last resort: the largest amount that is not cash or change
    const all = lines.filter((l) => !PAYMENT_LINE.test(l)).flatMap(amountsIn)
    if (all.length) best = Math.max(...all)
  }
  return best === null ? '' : (best as number).toFixed(2)
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function iso(y: number, m: number, d: number): string {
  if (y < 100) y += 2000
  const date = new Date(Date.UTC(y, m - 1, d))
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  if (!valid || y < 2000 || date.getTime() > Date.now() + 86_400_000) return ''
  return date.toISOString().slice(0, 10)
}

function findDate(text: string): string {
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (m) {
    const found = iso(+m[1], +m[2], +m[3])
    if (found) return found
  }
  // Malaysian receipts print day first
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/)
  if (m) {
    const found = iso(+m[3], +m[2], +m[1])
    if (found) return found
  }
  m = text.match(/\b(\d{1,2})[\s-]?([A-Za-z]{3})[A-Za-z]*[\s,-]*(\d{4}|\d{2})\b/)
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase())
    if (month >= 0) return iso(+m[3], month + 1, +m[1])
  }
  return ''
}

function findVendor(lines: string[]): string {
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^A-Za-z]/g, '').length
    if (letters >= 4 && letters / line.length > 0.5 && !/receipt|resit|invoice|invois|tax/i.test(line)) {
      return line.replace(/\s+/g, ' ').trim().slice(0, 80)
    }
  }
  return ''
}

export function parseReceiptText(text: string): ScanResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return { amount: findAmount(lines), date: findDate(text), vendor: findVendor(lines) }
}
