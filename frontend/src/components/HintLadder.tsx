// Hint ladder UI shared by practice sessions and the study tools: hint card, worked answer, easing chip.
import type { Adapt, AnswerResult } from '../api/types'

export function HintCard({ result }: { result: AnswerResult }) {
  const { hint, attempt, max_attempts, feedback, signal } = result
  return (
    <div className="mt-5 rounded-(--radius-card) border border-accent/40 bg-accent-soft p-4" role="status">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        {signal === 'ANSWER_SEEKING' ? <span>Have a go first</span> : <span>Hint {hint?.level ?? 0} of {(max_attempts ?? 1) - 1}</span>}
        {attempt != null && max_attempts != null && <span className="text-muted">· attempt {attempt} of {max_attempts}</span>}
      </div>
      {feedback && <p className="mt-2 font-semibold">{feedback}</p>}
      {hint && (
        <>
          <p className="mt-2">{hint.text}</p>
          {hint.quote && <blockquote className="mt-2 border-l-4 border-accent pl-3 text-lg italic">{hint.quote}</blockquote>}
          {hint.source && <p className="mt-1 text-xs text-muted">From your notes · {hint.source}</p>}
        </>
      )}
    </div>
  )
}

export function WorkedAnswer({ result }: { result: AnswerResult }) {
  return (
    <div className="mt-5 space-y-3 rounded-(--radius-card) border border-line bg-sunken p-4" role="status">
      <p className="font-semibold">{result.correct ? result.feedback : 'Here it is, worked through.'}</p>
      {result.reveal && <p className="text-lg"><span className="text-muted">Answer: </span><strong>{result.reveal}</strong></p>}
      {result.explanation && <p className="leading-relaxed">{result.explanation}</p>}
      {result.quotes?.map((q) => (
        <blockquote key={q} className="border-l-4 border-accent pl-3 italic">“{q}”{result.source && <span className="not-italic text-xs text-muted"> · {result.source}</span>}</blockquote>
      ))}
      {result.example && (
        <div className="rounded-(--radius-ctl) bg-surface p-3">
          <p className="text-xs font-bold uppercase text-muted">Made-up example, not from your notes</p>
          <p className="mt-1">{result.example}</p>
        </div>
      )}
      {result.why_wrong && (
        <div>
          <p className="text-xs font-bold uppercase text-muted">Why your answers missed</p>
          <p className="mt-1">{result.why_wrong}</p>
        </div>
      )}
    </div>
  )
}

export function EasingChip({ adapt }: { adapt: Adapt }) {
  const eased = adapt.state === 'EASED'
  return (
    <div role="status" className={`mb-4 flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold ${eased ? 'bg-warn-soft' : 'bg-ok-soft'}`}>
      <span aria-hidden className={`size-2.5 rounded-full ${eased ? 'animate-pulse bg-warn' : 'bg-ok'}`} />
      <span>{eased ? 'Easing a notch' : 'Back to normal'}</span>
      <span className="font-normal text-muted">{adapt.reason}</span>
    </div>
  )
}

// True while the ladder is still going; undefined (legacy or mock) means the item is over.
export const ladderOpen = (r: AnswerResult | null) => r?.done_with_item === false
