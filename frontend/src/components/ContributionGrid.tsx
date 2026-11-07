import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { SHADE_CLASS, shadeFor, type DaySummary } from '../lib/activity'

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const label = (d: DaySummary) =>
  `${new Date(`${d.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.sessions} sessions, ${d.tasks} tasks`
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ContributionGrid({ days, start, end, today }: { days: Map<string, DaySummary>; start: Date; end: Date; today: Date }) {
  const cells = useMemo(() => {
    const first = new Date(start)
    first.setDate(first.getDate() - first.getDay())
    const weekCount = Math.ceil((Math.round((end.getTime() - first.getTime()) / 86_400_000) + 1) / 7)
    const out: (DaySummary | null)[] = []
    for (let i = 0; i < weekCount * 7; i++) {
      const d = new Date(first)
      d.setDate(first.getDate() + i)
      const inRange = d >= start && d <= end
      const k = keyOf(d)
      out.push(inRange ? (days.get(k) ?? { date: k, sessions: 0, tasks: 0, labels: [] }) : null)
    }
    return out
  }, [days, start, end])

  const todayKey = keyOf(today)
  const [active, setActive] = useState(() => Math.max(0, cells.findIndex((c) => c?.date === todayKey)))
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const move = (to: number) => {
    const step = Math.sign(to - active)
    let i = Math.max(0, Math.min(cells.length - 1, to))
    while (cells[i] === null && i + step >= 0 && i + step < cells.length) i += step // skip the padding before the start / after the end
    if (cells[i] === null) return
    setActive(i)
    refs.current[i]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowUp: -7, ArrowDown: 7, ArrowLeft: -1, ArrowRight: 1 }[e.key]
    if (step !== undefined) {
      e.preventDefault()
      move(active + step)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-56 flex-1 flex-col justify-center gap-2">
      <div role="grid" aria-label="Study activity by day" onKeyDown={onKey} className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((name) => (
          <span key={name} aria-hidden className="text-center text-[10px] text-muted">{name}</span>
        ))}
        {cells.map((c, i) =>
          c === null ? null : (
            <button
              key={c.date}
              ref={(el) => { refs.current[i] = el }}
              role="gridcell"
              tabIndex={i === active ? 0 : -1}
              onFocus={() => setActive(i)}
              aria-label={label(c)}
              title={label(c)}
              aria-current={c.date === todayKey ? 'date' : undefined}
              style={{ gridRow: Math.floor(i / 7) + 2, gridColumn: (i % 7) + 1 }}
              className={`aspect-square w-full rounded-[3px] border ${SHADE_CLASS[shadeFor(c)]} ${c.date === todayKey ? 'ring-1 ring-accent ring-offset-1 ring-offset-bg' : ''}`}
            />
          ),
        )}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted" aria-hidden>
        <span className="mr-0.5">Less</span>
        {SHADE_CLASS.map((c) => <span key={c} className={`size-3 rounded-[3px] border ${c}`} />)}
        <span className="ml-0.5">More</span>
      </div>
    </div>
  )
}
