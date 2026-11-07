import type { SessionResult } from '../../api/types'
import { METHOD_LABEL } from '../../api/types'
import { ReflectionCard } from '../ReflectionCard'
import { Button, ButtonLink, Card, Chip } from '../ui'

export function Result({ result, focusedMin, subjectName, onAgain }: { result: SessionResult; focusedMin: number; subjectName: string; onAgain: () => void }) {
  const st = result.subject_state
  // Under a minute, whole-minute rounding reads as "0 of 1 min", so switch units.
  const short = result.active_minutes < 1
  const unit = short ? 's' : 'min'
  const scale = short ? 60 : 1
  const total = Math.max(1, Math.round(result.active_minutes * scale))
  const focused = Math.min(total, Math.max(0, Math.round(focusedMin * scale)))
  const correct = Math.round(result.probe_score * 5)
  const best = [...st.method_stats].sort((a, b) => b.mean_reward - a.mean_reward)[0]
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Session done · {subjectName}</p>
        <h2 className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Quick check {correct}/5
        </h2>
        <p className="mt-2 text-xl">You were focused for about {focused} of {total} {unit}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Learning per minute</p>
          <p className="text-2xl font-bold">{result.efficiency.toFixed(2)}</p>
          <p className="text-sm text-muted">quick-check score (0–1) per active minute</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Calibration</p>
          <p className="text-2xl font-bold">
            {Object.values(st.sampler).filter((s) => s.done).length} of 3 rounds
          </p>
          <p className="text-sm text-muted">{st.subject.phase === 'ADAPTIVE' ? 'Done. Attune now picks for you.' : 'Keep going to find your best method.'}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Best fit so far</p>
          <p className="text-2xl font-bold">{best ? METHOD_LABEL[best.method] : '—'}</p>
          <Chip>{st.confidence === 'EARLY' ? 'Early read' : st.confidence === 'MODERATE' ? 'Getting clearer' : 'Confident'}</Chip>
        </Card>
      </div>

      {result.reflection && <ReflectionCard reflection={result.reflection} subjectName={subjectName} />}

      <Card className="bg-sunken">
        <p className="font-semibold">Next time: {METHOD_LABEL[st.plan.method]} · {st.plan.session_minutes} min</p>
        <p className="text-muted">{st.plan.reason}</p>
      </Card>

      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/" variant="primary">Back to Home</ButtonLink>
        <Button onClick={onAgain}>Another session</Button>
        <ButtonLink to={`/insights/${st.subject.id}`} variant="ghost">See insights</ButtonLink>
      </div>
    </div>
  )
}
