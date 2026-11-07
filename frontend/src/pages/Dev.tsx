// /dev panel (PRD F9): seed the demo persona, advance days, force a reflection, reset.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import { api, clockNow, usingMock } from '../api/client'
import type { Reflection } from '../api/types'
import { PageShell } from '../components/PageShell'
import { ReflectionCard } from '../components/ReflectionCard'
import { Button, Card, ErrorBox } from '../components/ui'
import { setLocal, useLocal } from '../lib/local'

export function Dev() {
  const qc = useQueryClient()
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
  const { simulateDrift, cursorDot } = useLocal((s) => ({ simulateDrift: s.simulateDrift, cursorDot: s.cursorDot }))
  const [days, setDays] = useState(14)
  const [log, setLog] = useState<string[]>([])
  const [reflections, setReflections] = useState<Reflection[]>([])
  const note = (m: string) => setLog((l) => [`${new Date().toLocaleTimeString()} · ${m}`, ...l].slice(0, 8))
  const refresh = () => qc.invalidateQueries()

  const personas = useQuery({ queryKey: ['personas'], queryFn: api.devPersonas })
  const [persona, setPersona] = useState('ada')
  const seed = useMutation({
    mutationFn: () => api.devSeed(persona),
    onSuccess: (r) => {
      setLocal({ seededFlag: true, resume: null })
      note(`Loaded ${r.name ?? 'demo student'}${r.label ? ` (${r.label})` : ''}: subject ${r.subject_ids.join(', ')}`)
      refresh()
    },
  })
  const advance = useMutation({
    mutationFn: () => api.devAdvanceDays(days),
    onSuccess: (r) => {
      setReflections(r.reflections)
      note(`Advanced ${days} days → ${new Date(r.advanced_to).toLocaleDateString()} · ${r.reflections.length} reflection(s)`)
      refresh()
    },
  })
  const reflect = useMutation({
    mutationFn: (subject_id: number) => api.reflect({ subject_id, trigger: 'MANUAL' }),
    onSuccess: (r) => {
      setReflections([r])
      note(`Reflection: ${r.diagnosis}`)
      refresh()
    },
  })
  const reset = useMutation({
    mutationFn: api.devReset,
    onSuccess: () => {
      setLocal({ seededFlag: false, resume: null, questions: [], activity: [], frogSubjectId: null, frogDate: null, frogSkipped: null })
      setReflections([])
      note('Reset everything')
      refresh()
    },
  })
  const usage = useQuery({ queryKey: ['usage'], queryFn: api.devUsage })
  const err = seed.error ?? advance.error ?? reflect.error ?? reset.error

  return (
    <PageShell where="Dev panel" status={[{ label: 'API', value: usingMock ? 'mock (in browser)' : 'live backend' }, { label: 'Clock', value: new Date(clockNow()).toLocaleDateString() }]}>
      <h1 className="text-3xl font-extrabold">Dev panel</h1>
      <p className="mt-1 text-muted">For the demo. Seeded history is labelled "Demo data" everywhere it appears.</p>
      {err && <div className="mt-4"><ErrorBox error={err} /></div>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Demo state</h2>
          <div className="mt-3 grid gap-2">
            {(personas.data ?? []).map((p) => (
              <label key={p.key} className={`flex cursor-pointer items-start gap-2 rounded-(--radius-ctl) border p-2 ${persona === p.key ? 'border-ink bg-sunken' : 'border-line'}`}>
                <input type="radio" name="persona" checked={persona === p.key} onChange={() => setPersona(p.key)} className="mt-1" />
                <span><strong>{p.name}</strong> · {p.label}<span className="block text-sm text-muted">{p.blurb}</span></span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => seed.mutate()} disabled={seed.isPending}>Load demo student</Button>
            <Button onClick={() => reset.mutate()} disabled={reset.isPending}>Reset</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <label className="text-sm">
              Days
              <input type="number" min={1} max={60} value={days} onChange={(e) => setDays(Number(e.target.value) || 1)} className="ml-2 w-20 rounded-(--radius-ctl) border border-line bg-bg px-2 py-2" />
            </label>
            <Button onClick={() => advance.mutate()} disabled={advance.isPending}>Advance {days} days</Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Force a reflection</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(subjects.data ?? []).map((s) => (
              <Button key={s.subject.id} onClick={() => reflect.mutate(s.subject.id)} disabled={reflect.isPending}>{s.subject.name}</Button>
            ))}
            {!subjects.data?.length && <p className="text-muted">Seed or add a subject first.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Demo helpers</h2>
          <label className="mt-3 flex items-start gap-2">
            <input type="checkbox" checked={simulateDrift} onChange={(e) => setLocal({ simulateDrift: e.target.checked })} className="mt-1" />
            <span>
              Simulate drift <span className="text-muted">(reports answers as slow and uneven so a break triggers; demo only)</span>
            </span>
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={cursorDot} onChange={(e) => setLocal({ cursorDot: e.target.checked })} /> Cursor dot outside sessions
          </label>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">LLM usage</h2>
          <p className="mt-2 text-sm text-muted">{usingMock ? 'Mock API: no LLM calls are made.' : 'From GET /dev/usage.'}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
            {Object.entries(usage.data ?? {}).map(([k, v]) => (
              <Fragment key={k}><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></Fragment>
            ))}
          </dl>
        </Card>
      </div>

      {reflections.length > 0 && (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-bold">Latest reflections</h2>
          {reflections.map((r) => <ReflectionCard key={r.id} reflection={r} />)}
        </section>
      )}

      {log.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold">Log</h2>
          <ul className="mt-2 font-mono text-sm">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}
    </PageShell>
  )
}
