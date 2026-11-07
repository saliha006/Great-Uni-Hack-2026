import { useQueries, useQuery } from '@tanstack/react-query'
import { api, clockNow } from '../api/client'
import { METHOD_LABEL } from '../api/types'
import { ContributionGrid } from '../components/ContributionGrid'
import { PageShell } from '../components/PageShell'
import { Card, ErrorBox, Spinner } from '../components/ui'
import type { DaySummary } from '../lib/activity'
import { useLocal } from '../lib/local'

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function Progress() {
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
  const list = subjects.data ?? []
  const insights = useQueries({
    queries: list.map((s) => ({ queryKey: ['insights', s.subject.id], queryFn: () => api.insights(s.subject.id) })),
  })
  const activity = useLocal((s) => s.activity)
  const questions = useLocal((s) => s.questions)

  const days = (() => {
    const m = new Map<string, DaySummary>()
    const get = (k: string) => m.get(k) ?? (m.set(k, { date: k, sessions: 0, tasks: 0, labels: [] }), m.get(k)!)
    insights.forEach((q, i) => {
      const name = list[i]?.subject.name ?? ''
      for (const [method, pts] of Object.entries(q.data?.method_series ?? {})) {
        for (const p of pts) {
          const d = get(dayKey(p.ts))
          d.sessions++
          d.labels.push(`${name}: ${METHOD_LABEL[method as keyof typeof METHOD_LABEL] ?? method} · check ${Math.round(p.probe_score * 5)}/5`)
        }
      }
    })
    for (const a of activity) {
      if (a.kind === 'SESSION') continue // already counted from the API above
      const d = get(a.date)
      d.tasks++
      d.labels.push(a.label)
    }
    return m
  })()

  const totals = (() => {
    let sessions = 0
    insights.forEach((q) => {
      sessions += Object.values(q.data?.method_series ?? {}).reduce((n, p) => n + p.length, 0)
    })
    return { sessions, frogs: activity.filter((a) => a.kind === 'FROG').length, resolved: questions.filter((q) => q.resolved).length }
  })()

  const loading = subjects.isPending || insights.some((q) => q.isPending)

  return (
    <PageShell
      where="Progress"
      status={[
        { label: 'Sessions', value: totals.sessions },
        { label: 'Frogs eaten', value: totals.frogs },
        { label: 'Questions answered', value: `${totals.resolved} of ${questions.length}` },
      ]}
      next="Fill today's square"
    >
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your ground covered</h1>
      <p className="mt-1 text-muted">Every session and every finished task fills in a square. Empty days just stay grey.</p>

      {subjects.isError && <ErrorBox error={subjects.error} onRetry={() => subjects.refetch()} />}
      {loading ? <Spinner label="Counting your sessions" /> : (
        <>
          <Card className="mt-6">
            <h2 className="mb-3 text-xl font-bold">Last 20 weeks</h2>
            <ContributionGrid days={days} endDate={new Date(clockNow())} />
          </Card>

          <section className="mt-8" aria-labelledby="territory-h">
            <h2 id="territory-h" className="text-xl font-bold">Territory by subject</h2>
            <p className="text-muted">Filled squares are sessions done. Empty ones are roughly one a day until the exam.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {list.map((s, i) => {
                const done = Object.values(insights[i]?.data?.method_series ?? {}).reduce((n, p) => n + p.length, 0)
                const daysLeft = s.subject.exam_date ? Math.max(0, Math.ceil((Date.parse(s.subject.exam_date) - Date.parse(clockNow())) / 86_400_000)) : 10
                const total = Math.min(60, done + daysLeft)
                return (
                  <Card key={s.subject.id} as="article">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-bold">{s.subject.name}</h3>
                      <span className="text-sm text-muted">{done} of ~{total}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1" role="img" aria-label={`${done} sessions done of about ${total}`}>
                      {Array.from({ length: total }, (_, k) => (
                        <span key={k} className={`size-4 rounded-[3px] ${k < done ? 'bg-g4' : 'border border-line bg-transparent'}`} />
                      ))}
                    </div>
                  </Card>
                )
              })}
              {!list.length && <p className="text-muted">Add a subject to start filling squares.</p>}
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Totals">
            <Card><p className="text-sm text-muted">Study sessions</p><p className="text-3xl font-extrabold">{totals.sessions}</p></Card>
            <Card><p className="text-sm text-muted">Questions answered</p><p className="text-3xl font-extrabold">{totals.resolved}</p></Card>
            <Card><p className="text-sm text-muted">Frogs eaten first</p><p className="text-3xl font-extrabold">{totals.frogs}</p></Card>
          </section>
        </>
      )}
    </PageShell>
  )
}
