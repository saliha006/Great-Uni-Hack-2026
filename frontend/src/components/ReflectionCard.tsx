import type { DiagnosisName, Reflection } from '../api/types'
import { METHOD_LABEL } from '../api/types'
import { Card, Chip } from './ui'

const DIAG: Record<DiagnosisName, { label: string; tone: 'ok' | 'warn' | 'accent' | 'neutral' }> = {
  ON_TRACK: { label: 'On track', tone: 'ok' },
  MASTERED: { label: 'Mastered', tone: 'ok' },
  LOW_ENGAGEMENT: { label: 'Fewer sessions lately', tone: 'warn' },
  FATIGUE: { label: 'Tired, not stuck', tone: 'warn' },
  PLATEAU: { label: 'Plateau', tone: 'accent' },
}

function decisionText(r: Reflection): string {
  const d = r.decision
  switch (d.action) {
    case 'KEEP': return 'Keep the current plan.'
    case 'TRIAL_METHOD': return `Try ${d.method ? METHOD_LABEL[d.method] : 'another method'} for ${d.trial_days ?? 7} days, then compare.`
    case 'SHORTEN_SESSIONS': return `Shorter sessions${d.session_minutes ? ` (${d.session_minutes} min)` : ''} for a while. Same method.`
    case 'EASE_IN': return 'Ease back in with a short 5-minute session.'
    case 'RAISE_DIFFICULTY': return 'Move on to harder material.'
  }
}

export function ReflectionCard({ reflection, subjectName }: { reflection: Reflection; subjectName?: string }) {
  const d = DIAG[reflection.diagnosis]
  return (
    <Card as="article" className="border-ink">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">Why your plan {reflection.decision.action === 'KEEP' ? 'stays' : 'changed'}</h3>
        <Chip tone={d.tone}>{d.label}</Chip>
        {subjectName && <span className="text-sm text-muted">{subjectName}</span>}
        <span className="ml-auto text-sm text-muted">
          {reflection.trigger === 'WEEKLY' ? 'Weekly check' : reflection.trigger === 'PLATEAU' ? 'Plateau check' : 'Manual check'} ·{' '}
          {new Date(reflection.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <p className="mt-3 text-base leading-relaxed">{reflection.explanation}</p>
      <p className="mt-2 font-semibold">{decisionText(reflection)}</p>
    </Card>
  )
}
