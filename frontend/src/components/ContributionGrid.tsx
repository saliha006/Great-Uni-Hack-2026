// GitHub-style activity map: one square per day, darker = more done. Keyboard: Tab into the
// grid, arrow keys move day by day, the focused day's details show below.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { shadeFor, type DaySummary } from '../lib/activity'

const SHADE = ['bg-g0', 'bg-g1', 'bg-g2', 'bg-g3', 'bg-g4']
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function ContributionGrid({ days, endDate, weeks = 20 }: { days: Map<string, DaySummary>; endDate: Date; weeks?: number }) {
  const cells = useMemo(() => {
    const end = new Date(endDate)
    end.setHours(12, 0, 0, 0)
    const start = new Date(end)
    start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7) // Sunday, `weeks` columns back
    const out: DaySummary[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = keyOf(d)
      out.push(days.get(k) ?? { date: k, sessions: 0, tasks: 0, labels: [] })
    }
    return out
  }, [days, endDate, weeks])

  const [active, setActive] = useState(cells.length - 1)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (to: number) => {
    const i = Math.max(0, Math.min(cells.length - 1, to))
    setActive(i)
    refs.current[i]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key]
    if (step !== undefined) { e.preventDefault(); move(active + step) }
  }
  const sel = cells[active]
  const fmt = (k: string) => new Date(`${k}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const months = cells.filter((_, i) => i % 7 === 0).map((c, i, arr) => {
    const m = new Date(`${c.date}T12:00`).toLocaleDateString(undefined, { month: 'short' })
    const prev = i ? new Date(`${arr[i - 1].date}T12:00`).toLocaleDateString(undefined, { month: 'short' }) : ''
    return m !== prev ? m : ''
  })

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-block">
          <div className="mb-1 grid grid-flow-col gap-1 text-xs text-muted" style={{ gridTemplateColumns: `repeat(${weeks}, 0.875rem)` }} aria-hidden>
            {months.map((m, i) => <span key={i} className="w-3.5 overflow-visible whitespace-nowrap">{m}</span>)}
          </div>
          <div role="grid" aria-label="Study activity by day" onKeyDown={onKey} className="grid grid-flow-col grid-rows-7 gap-1">
            {cells.map((c, i) => {
              const s = shadeFor(c)
              return (
                <button
                  key={c.date}
                  ref={(el) => { refs.current[i] = el }}
                  role="gridcell"
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={`${fmt(c.date)}: ${c.sessions} sessions, ${c.tasks} tasks`}
                  aria-selected={i === active}
                  className={`size-3.5 rounded-[3px] ${SHADE[s]} ${i === active ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                />
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">Less</span>
        {SHADE.map((c) => <span key={c} className={`size-3.5 rounded-[3px] ${c}`} aria-hidden />)}
        <span className="text-muted">More</span>
      </div>
      <div className="mt-3 min-h-16 rounded-(--radius-ctl) bg-sunken p-3" aria-live="polite">
        <p className="font-semibold">{fmt(sel.date)}</p>
        {sel.labels.length ? (
          <ul className="mt-1 text-sm">{sel.labels.map((l, i) => <li key={i}>{l}</li>)}</ul>
        ) : (
          <p className="text-sm text-muted">Nothing logged. Rest days count too.</p>
        )}
      </div>
    </div>
  )
}
