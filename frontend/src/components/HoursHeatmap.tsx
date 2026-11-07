// Estimated focus minutes by weekday and hour for the last 7 days: rows are days, columns are the
// 24 hours, darker = more study. Same square style as the semester grid; every other weekday is labelled
// so the labels fit the small rows.
import { SHADE_CLASS, type Shade } from '../lib/activity'

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h % 24 < 12 ? 'a' : 'p'}`
const AXIS_HOURS = [0, 6, 12, 18]
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const duration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${Math.round(min % 60)}m` : `${Math.round(min)} min`)

export function HoursHeatmap({ hours, endDate }: { hours: Map<string, number[]>; endDate: Date }) {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(endDate)
    date.setDate(date.getDate() - (6 - i))
    return { weekday: date.toLocaleDateString(undefined, { weekday: 'short' }), minutes: hours.get(keyOf(date)) ?? Array<number>(24).fill(0) }
  })
  const total = rows.reduce((n, r) => n + r.minutes.reduce((a, b) => a + b, 0), 0)
  const max = Math.max(...rows.flatMap((r) => r.minutes))
  const peak = rows.flatMap((r) => r.minutes.map((m, h) => ({ m, h, weekday: r.weekday }))).reduce((a, b) => (b.m > a.m ? b : a))
  const peakText = total > 0 ? `Peak · ${peak.weekday} ${hourLabel(peak.h)}–${hourLabel(peak.h + 1)}` : 'No study yet this week'
  const shade = (m: number): Shade => (m <= 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((m / max) * 4))) as Shade))
  const layout = { gridTemplateColumns: '2rem repeat(24, minmax(0, 1fr))' }

  return (
    <div role="img" aria-label={`Estimated study minutes by hour for the last 7 days. ${duration(total)} in total. ${peakText}.`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-bold leading-none">{duration(total)}</p>
          <p className="mt-1 text-xs text-muted">{peakText}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold leading-none">{duration(total / 7)}</p>
          <p className="mt-1 text-xs text-muted">Avg / day</p>
        </div>
      </div>
      <div className="grid gap-1" style={layout} aria-hidden>
        {rows.map((r, d) => d % 2 === 0 && (
          <span key={d} className="flex h-0 items-center text-xs text-muted" style={{ gridRow: d + 1, gridColumn: 1 }}>{r.weekday}</span>
        ))}
        {rows.flatMap((r, d) =>
          r.minutes.map((m, h) => (
            <span
              key={`${d}-${h}`}
              title={`${r.weekday} ${hourLabel(h)}: ${Math.round(m)} min`}
              style={{ gridRow: d + 1, gridColumn: h + 2 }}
              className={`aspect-square w-full rounded-[3px] border ${SHADE_CLASS[shade(m)]}`}
            />
          )),
        )}
        {AXIS_HOURS.map((h) => (
          <span key={h} className="mt-0.5 whitespace-nowrap text-xs text-muted" style={{ gridRow: 8, gridColumn: h + 2 }}>{hourLabel(h)}</span>
        ))}
        <span className="mt-0.5 justify-self-end whitespace-nowrap text-xs text-muted" style={{ gridRow: 8, gridColumn: 26 }}>{hourLabel(24)}</span>
      </div>
    </div>
  )
}
