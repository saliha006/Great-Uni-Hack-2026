// Insights page body (PRD F8, demo beats 1:15-1:52): method fit, scores over time, attention, timeline, reflections.
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { METHOD_LABEL } from '../api/types'
import { AttentionBySession, MethodFitChart, ScoreOverTime, Timeline } from '../components/insights/charts'
import { PageShell } from '../components/PageShell'
import { ReflectionCard } from '../components/ReflectionCard'
import { Card, Chip, ErrorBox, Meter, Spinner } from '../components/ui'

const DEMO_LABEL = '[Demo data]'
const CONFIDENCE_TEXT = { EARLY: 'Early read', MODERATE: 'Moderate confidence', HIGH: 'High confidence' } as const

export function Insights() {
  const subjectId = Number(useParams().subjectId)
  const state = useQuery({ queryKey: ['state', subjectId], queryFn: () => api.subjectState(subjectId) })
  const insights = useQuery({ queryKey: ['insights', subjectId], queryFn: () => api.insights(subjectId) })
  const reflections = useQuery({ queryKey: ['reflections', subjectId], queryFn: () => api.reflections(subjectId) })
  const st = state.data
  const ins = insights.data
  const failed = state.error ?? insights.error ?? reflections.error
  // Seeded history is labelled by the backend; any labelled entry means the charts include demo data.
  const seeded = !!ins?.timeline.some((e) => e.label.startsWith(DEMO_LABEL))
    || !!reflections.data?.some((r) => r.explanation.startsWith(DEMO_LABEL))

  return (
    <PageShell where={`Insights${st ? ` · ${st.subject.name}` : ''}`}
               status={st ? [{ label: 'Confidence', value: CONFIDENCE_TEXT[st.confidence].toLowerCase() }] : []}>
      {(state.isPending || insights.isPending) && <Spinner label="Loading insights" />}
      {failed && <ErrorBox error={failed} onRetry={() => { state.refetch(); insights.refetch(); reflections.refetch() }} />}
      {st && ins && (
        <>
          {seeded && (
            <p role="note" className="mb-4 rounded-lg bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">
              Demo data: the history on this page is seeded to show how Attune behaves over several weeks.
            </p>
          )}
          <h1 className="text-3xl font-extrabold">{st.subject.name}</h1>
          <p className="mt-1 text-muted">{st.plan.reason}</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Which method works for you here</h2>
                <Chip tone={st.confidence === 'EARLY' ? 'warn' : 'neutral'}>{CONFIDENCE_TEXT[st.confidence]}</Chip>
              </div>
              <p className="mt-1 text-sm text-muted">Bars show fit; whiskers show how sure we are so far.</p>
              <MethodFitChart stats={st.method_stats} />
            </Card>
            <Card>
              <h2 className="text-lg font-bold">Probe score over time</h2>
              <p className="mt-1 text-sm text-muted">Same 5-question check after every session.</p>
              <ScoreOverTime series={ins.method_series} />
            </Card>
            <Card>
              <h2 className="text-lg font-bold">Focus by session</h2>
              <p className="mt-1 text-sm text-muted">From your answer timing compared with your own usual pace.</p>
              <AttentionBySession rows={ins.attention_by_session} />
            </Card>
            <Card>
              <h2 className="text-lg font-bold">Readiness estimate</h2>
              {st.readiness ? (
                <div className="mt-3 space-y-3">
                  <Meter label="Performance" value={st.readiness.performance} />
                  <Meter label="Understanding" value={st.readiness.understanding} />
                  <p className="text-sm text-muted">
                    Confidence: {st.readiness.confidence.toLowerCase()}. Not checked against real exam results yet.
                  </p>
                </div>
              ) : <p className="mt-3 text-muted">Finish a session to see an estimate.</p>}
              <p className="mt-3 text-sm text-muted">
                Current plan: {METHOD_LABEL[st.plan.method]}, {st.plan.session_minutes} min
                {st.plan.trial_until ? `, trial until ${st.plan.trial_until}` : ''}.
              </p>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <h2 className="text-lg font-bold">Timeline</h2>
              <div className="mt-3"><Timeline entries={ins.timeline} /></div>
            </Card>
            <div className="space-y-4 lg:col-span-2">
              <h2 className="text-lg font-bold">Reflections</h2>
              {reflections.data?.length
                ? reflections.data.map((r) => <ReflectionCard key={r.id} reflection={r} subjectName={st.subject.name} />)
                : <p className="text-muted">The agent reflects weekly, or when progress stalls.</p>}
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}
