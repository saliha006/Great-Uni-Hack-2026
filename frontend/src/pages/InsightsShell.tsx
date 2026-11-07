// Route + shell for Insights (PRD F8). Saliha owns the page body (frontend/src/pages/Insights.tsx,
// components/insights/**); this shell only hosts it so the route works before her page lands.
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { METHOD_LABEL } from '../api/types'
import { PageShell } from '../components/PageShell'
import { Card, Chip, ErrorBox, Meter, Spinner } from '../components/ui'

export function InsightsShell() {
  const subjectId = Number(useParams().subjectId)
  const state = useQuery({ queryKey: ['state', subjectId], queryFn: () => api.subjectState(subjectId) })
  const st = state.data

  return (
    <PageShell where={`Insights${st ? ` · ${st.subject.name}` : ''}`} status={st ? [{ label: 'Confidence', value: st.confidence.toLowerCase() }] : []}>
      {state.isPending && <Spinner label="Loading insights" />}
      {state.isError && <ErrorBox error={state.error} onRetry={() => state.refetch()} />}
      {st && (
        <>
          <h1 className="text-3xl font-extrabold">{st.subject.name}</h1>
          <p className="mt-1 text-muted">Method fit so far. Saliha's full Insights page (charts, timeline) replaces this view.</p>
          <Card className="mt-6">
            <h2 className="text-lg font-bold">Which method works for you here</h2>
            <div className="mt-3 space-y-4">
              {[...st.method_stats].sort((a, b) => b.mean_reward - a.mean_reward).map((m) => (
                <div key={m.method}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{METHOD_LABEL[m.method]}</span>
                    <Chip>{m.n} session{m.n === 1 ? '' : 's'}</Chip>
                  </div>
                  <Meter className="mt-1" label={`Fit (range ${Math.round(m.ci_low * 100)}–${Math.round(m.ci_high * 100)}%)`} value={m.mean_reward} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </PageShell>
  )
}
