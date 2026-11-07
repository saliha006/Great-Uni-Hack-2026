import {
  Bar, BarChart, CartesianGrid, ErrorBar, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Insights, Method, MethodStatView } from '../../api/types'
import { METHOD_LABEL } from '../../api/types'

// Palette tokens from index.css, so charts follow Maxym's theme.
const SERIES = ['var(--color-accent)', 'var(--color-interaction)', 'var(--color-ok)', 'var(--color-warn)', 'var(--color-g2)']
const AXIS = { stroke: 'var(--color-muted)', fontSize: 12 }
const pct = (v: number) => `${Math.round(v * 100)}%`
// Tooltip values can be missing or non-numeric in Recharts 3.
const tipPct = (v: unknown) => (typeof v === 'number' ? pct(v) : String(v ?? ''))
const day = (ts: string) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export function MethodFitChart({ stats }: { stats: MethodStatView[] }) {
  const data = [...stats]
    .sort((a, b) => b.mean_reward - a.mean_reward)
    .map((m) => ({
      name: METHOD_LABEL[m.method],
      fit: m.mean_reward,
      // ErrorBar takes distances from the bar top, not the interval ends.
      range: [m.mean_reward - m.ci_low, m.ci_high - m.mean_reward],
      n: m.n,
    }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis domain={[0, 1]} tickFormatter={pct} {...AXIS} />
        <Tooltip formatter={tipPct} labelFormatter={(l) => `${l}`} />
        <Bar dataKey="fit" name="Fit" fill="var(--color-accent)" radius={[6, 6, 0, 0]}>
          <ErrorBar dataKey="range" width={8} stroke="var(--color-ink)" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ScoreOverTime({ series }: { series: Insights['method_series'] }) {
  const methods = Object.keys(series) as Method[]
  const byTs = new Map<string, Record<string, number | string>>()
  for (const m of methods) {
    for (const p of series[m]) {
      const row = byTs.get(p.ts) ?? { ts: p.ts }
      row[m] = p.probe_score
      byTs.set(p.ts, row)
    }
  }
  const data = [...byTs.values()].sort((a, b) => String(a.ts).localeCompare(String(b.ts)))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-line)" vertical={false} />
        <XAxis dataKey="ts" tickFormatter={day} {...AXIS} />
        <YAxis domain={[0, 1]} tickFormatter={pct} {...AXIS} />
        <Tooltip labelFormatter={(l) => day(String(l))} formatter={tipPct} />
        <Legend />
        {methods.map((m, i) => (
          <Line key={m} type="monotone" dataKey={m} name={METHOD_LABEL[m]} stroke={SERIES[i % SERIES.length]}
                strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AttentionBySession({ rows }: { rows: Insights['attention_by_session'] }) {
  const data = rows.map((r) => ({
    ts: r.ts,
    focused: Math.max(0, 1 - r.drift_share - r.lapse_share),
    drifting: r.drift_share,
    lapsed: r.lapse_share,
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <XAxis dataKey="ts" tickFormatter={day} {...AXIS} />
        <YAxis domain={[0, 1]} tickFormatter={pct} {...AXIS} />
        <Tooltip labelFormatter={(l) => day(String(l))} formatter={tipPct} />
        <Legend />
        <Bar dataKey="focused" name="Focused" stackId="a" fill="var(--color-g2)" />
        <Bar dataKey="drifting" name="Drifting" stackId="a" fill="var(--color-warn)" />
        <Bar dataKey="lapsed" name="Lapsed" stackId="a" fill="var(--color-interaction)" />
      </BarChart>
    </ResponsiveContainer>
  )
}

const KIND_LABEL: Record<Insights['timeline'][number]['kind'], string> = {
  SAMPLER_DONE: 'Calibration',
  RECALIBRATION: 'Reflection',
  TRIAL_START: 'Trial',
  TRIAL_END: 'Trial',
  BREAK: 'Break',
}

export function Timeline({ entries }: { entries: Insights['timeline'] }) {
  if (!entries.length) return <p className="text-muted">Nothing yet. Events appear as you study.</p>
  return (
    <ol className="space-y-3 border-l-2 border-line pl-4">
      {entries.map((e, i) => (
        <li key={`${e.ts}-${i}`}>
          <p className="text-sm text-muted">{day(e.ts)} · {KIND_LABEL[e.kind]}</p>
          <p className="font-semibold">{e.label}</p>
        </li>
      ))}
    </ol>
  )
}
