import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { AnswerResult, Item } from '../../api/types'
import { Button, ErrorBox } from '../ui'

interface Props {
  sessionId: number
  item: Item
  itemShown: (id: number) => void
  itemAnswered: (id: number) => number
  onNext: () => void
}

export function ItemView({ sessionId, item, itemShown, itemAnswered, onNext }: Props) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [graded, setGraded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [hint, setHint] = useState(false)
  const [latency, setLatency] = useState(0)

  useEffect(() => {
    itemShown(item.id)
  }, [item.id, itemShown])

  const submit = async (choice?: string) => {
    const value = choice ?? answer
    setBusy(true)
    setError(null)
    try {
      const latency_ms = itemAnswered(item.id)
      setLatency(latency_ms)
      setResult(await api.answer(sessionId, { item_id: item.id, answer: value, latency_ms }))
      if (choice !== undefined) setAnswer(choice)
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  // Active Recall: one tap self-grade after the reveal; sent as self_grade (§11 AnswerBody).
  const selfGrade = async (g: 0 | 0.5 | 1) => {
    setBusy(true)
    try {
      await api.answer(sessionId, { item_id: item.id, answer, latency_ms: latency, self_grade: g })
      setGraded(true)
      onNext()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const isRecall = item.kind === 'RECALL_PROMPT'
  const isMcq = item.kind === 'MCQ' && item.options?.length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{isRecall ? 'From memory' : isMcq ? 'Multiple choice' : item.kind === 'PROBLEM' ? 'Problem' : 'Short answer'}</span>
        <span aria-hidden>·</span>
        <span>Difficulty {item.difficulty} of 5</span>
        {!isRecall && !result && <ItemClock seconds={item.expected_seconds} />}
      </div>
      <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">{item.prompt}</h2>

      {item.hint && !result && (
        hint ? <p className="mt-3 rounded-(--radius-ctl) bg-sunken p-3">Hint: {item.hint}</p>
          : <button className="mt-3 text-sm font-semibold underline" onClick={() => setHint(true)}>Show a hint</button>
      )}

      {isMcq ? (
        <fieldset className="mt-5 grid gap-2 sm:grid-cols-2" disabled={!!result || busy}>
          <legend className="sr-only">Choose an answer</legend>
          {item.options!.map((o, i) => {
            const picked = answer === o
            const state = result && picked ? (result.correct ? 'border-ok bg-ok-soft' : 'border-accent bg-accent-soft') : 'border-line hover:bg-sunken'
            return (
              <button key={o} onClick={() => submit(o)} className={`min-h-12 rounded-(--radius-ctl) border bg-surface px-4 py-3 text-left text-lg font-medium ${state}`}>
                <span className="mr-2 font-bold text-muted">{String.fromCharCode(65 + i)}</span>{o}
              </button>
            )
          })}
        </fieldset>
      ) : (
        <div className="mt-5">
          <label htmlFor={`a-${item.id}`} className="sr-only">Your answer</label>
          <textarea
            id={`a-${item.id}`}
            autoFocus
            rows={isRecall ? 4 : 5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            readOnly={!!result}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !result) submit() }}
            placeholder={isRecall ? 'Write what you remember. Rough is fine.' : 'Your answer'}
            className="w-full rounded-(--radius-ctl) border border-line bg-surface p-3 text-lg leading-relaxed"
          />
          {!result && (
            <div className="mt-3 flex items-center gap-3">
              <Button variant="primary" onClick={() => submit()} disabled={busy}>
                {isRecall ? 'Show the answer' : 'Submit'}
              </Button>
              <span className="text-sm text-muted">Ctrl + Enter</span>
            </div>
          )}
        </div>
      )}

      {error !== null && <div className="mt-4"><ErrorBox error={error} onRetry={() => submit()} /></div>}

      {result && (
        <div className="mt-5 rounded-(--radius-card) border border-line bg-sunken p-4" role="status">
          {result.feedback && <p className="font-semibold">{result.feedback}</p>}
          {result.reveal && (
            <p className="mt-2 text-lg leading-relaxed">
              <span className="text-muted">Model answer: </span>{result.reveal}
            </p>
          )}
          {isRecall && !graded ? (
            <div className="mt-4">
              <p className="font-semibold">How close were you?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => selfGrade(1)} disabled={busy}>Got it</Button>
                <Button onClick={() => selfGrade(0.5)} disabled={busy}>Partly</Button>
                <Button onClick={() => selfGrade(0)} disabled={busy}>Missed it</Button>
              </div>
            </div>
          ) : (
            <Button variant="primary" className="mt-4" onClick={onNext} autoFocus>Next</Button>
          )}
        </div>
      )}
    </div>
  )
}

// Visible per-item timer for Practice Test (brief M2). Soft: it never auto-submits.
function ItemClock({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <span aria-hidden>·</span>
      <span className={`tabular-nums ${left < 0 ? 'font-semibold text-ink' : ''}`}>
        {left >= 0 ? `${left}s suggested` : 'Take your time'}
      </span>
    </>
  )
}
