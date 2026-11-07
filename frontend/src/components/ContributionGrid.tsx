// GitHub-style activity map for one semester: one square per day, start to end, filling the card's
// width. Empty days keep a visible outline; filled days get darker the more was done. Keyboard: Tab
// into the grid, then arrow keys move day by day (up/down) or week by week (left/right).
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { shadeFor, type DaySummary } from '../lib/activity'

const SHADE = ['border-line', 'border-transparent bg-g1', 'border-transparent bg-g2', 'border-transparent bg-g3', 'border-transparent bg-g4']
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const label = (d: DaySummary) =>
  `${new Date(`${d.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}: ${d.sessions} sessions, ${d.tasks} tasks`

export function ContributionGrid({ days, start, end, today }: { days: Map<string, DaySummary>; start: Date; end: Date; today: Date }) {
  const { cells, weeks, months } = useMemo(() => {
    const first = new Date(start)
    first.setDate(first.getDate() - first.getDay()) // columns are Sunday-first weeks
    const weekCount = Math.ceil((Math.round((end.getTime() - first.getTime()) / 86_400_000) + 1) / 7)
    const out: (DaySummary | null)[] = []
    const monthLabels: { week: number; name: string }[] = []
    for (let i = 0; i < weekCount * 7; i++) {
      const d = new Date(first)
      d.setDate(first.getDate() + i)
      const inRange = d >= start && d <= end
      const k = keyOf(d)
      out.push(inRange ? (days.get(k) ?? { date: k, sessions: 0, tasks: 0, labels: [] }) : null)
      if (inRange && d.getDate() === 1) monthLabels.push({ week: Math.floor(i / 7), name: d.toLocaleDateString(undefined, { month: 'short' }) })
    }
    return { cells: out, weeks: weekCount, months: monthLabels }
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
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key]
    if (step !== undefined) {
      e.preventDefault()
      move(active + step)
    }
  }
  const columns = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }

  return (
    <div className="flex flex-1 flex-col justify-center gap-1">
      <div className="grid gap-1 text-xs text-muted" style={columns} aria-hidden>
        {months.map((m) => (
          <span key={m.week} className="overflow-visible whitespace-nowrap" style={{ gridColumnStart: m.week + 1 }}>{m.name}</span>
        ))}
      </div>
      <div role="grid" aria-label="Study activity by day" onKeyDown={onKey} className="grid grid-flow-col grid-rows-7 gap-1" style={columns}>
        {cells.map((c, i) =>
          c === null ? (
            <span key={i} aria-hidden />
          ) : (
            <button
              key={c.date}
              ref={(el) => { refs.current[i] = el }}
              role="gridcell"
              tabIndex={i === active ? 0 : -1}
              onFocus={() => setActive(i)}
              aria-label={label(c)}
              title={label(c)}
              className={`aspect-square w-full rounded-[3px] border ${SHADE[shadeFor(c)]}`}
            />
          ),
        )}
      </div>
    </div>
  )
}
