import { useState } from 'react'
import { formatRM } from '@/lib/format'

export type BarItem = { label: string; cents: number }

// Horizontal bars for one measure, sorted largest first, each directly labelled.
export function BarList({ items, empty }: { items: BarItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>
  const max = Math.max(...items.map((i) => i.cents))
  const total = items.reduce((sum, i) => sum + i.cents, 0)
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${formatRM(item.cents)} (${Math.round((item.cents / total) * 100)}%)`}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{item.label}</span>
            <span className="shrink-0 tabular-nums text-slate-900">{formatRM(item.cents)}</span>
          </div>
          <div className="mt-1 h-2 rounded bg-slate-100">
            <div className="h-2 rounded bg-series-out" style={{ width: `${Math.max(1, (item.cents / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export type MonthPoint = { key: string; label: string; inCents: number; outCents: number }

const PLOT_HEIGHT = 160

// Money in and money out per month, as paired bars on one shared scale.
export function MonthlyChart({ months }: { months: MonthPoint[] }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...months.flatMap((m) => [m.inCents, m.outCents]))
  const height = (cents: number) => (cents === 0 ? 0 : Math.max(2, (cents / max) * PLOT_HEIGHT))

  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-series-in" /> Money in
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-series-out" /> Money out
        </span>
        {max > 1 && <span className="ml-auto text-slate-400">Scale max {formatRM(max)}</span>}
      </div>

      <div className="flex items-end border-b border-slate-300" style={{ height: PLOT_HEIGHT }}>
        {months.map((m) => (
          <button
            key={m.key}
            type="button"
            className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-px rounded-t hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            onMouseEnter={() => setActive(m.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(m.key)}
            onBlur={() => setActive(null)}
            aria-label={`${m.label}: money in ${formatRM(m.inCents)}, money out ${formatRM(m.outCents)}`}
          >
            <span className="w-2/5 max-w-[18px] rounded-t bg-series-in" style={{ height: height(m.inCents) }} />
            <span className="w-2/5 max-w-[18px] rounded-t bg-series-out" style={{ height: height(m.outCents) }} />
            {active === m.key && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-700 shadow">
                <span className="block font-medium text-slate-900">{m.label}</span>
                <span className="block">In {formatRM(m.inCents)}</span>
                <span className="block">Out {formatRM(m.outCents)}</span>
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex">
        {months.map((m) => (
          <span key={m.key} className="flex-1 pt-1 text-center text-[11px] text-slate-500">
            {m.label.split(' ')[0]}
          </span>
        ))}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-600">View as table</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr>
              <th className="th">Month</th>
              <th className="th text-right">Money in</th>
              <th className="th text-right">Money out</th>
              <th className="th text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((m) => (
              <tr key={m.key}>
                <td className="td">{m.label}</td>
                <td className="td text-right tabular-nums">{formatRM(m.inCents)}</td>
                <td className="td text-right tabular-nums">{formatRM(m.outCents)}</td>
                <td className="td text-right tabular-nums">{formatRM(m.inCents - m.outCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
