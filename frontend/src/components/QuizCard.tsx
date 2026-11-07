// One tutor or study-set question, answered through the same hint ladder as a session.
import { useState } from 'react'
import { api } from '../api/client'
import type { AnswerResult } from '../api/types'
import { HintCard, ladderOpen, WorkedAnswer } from './HintLadder'
import { Button, ErrorBox } from './ui'

export function QuizCard({ subjectId, qid, kind, prompt, options, quote, source, marks, index }: {
  subjectId: number; qid: string; kind: string; prompt: string; options?: string[] | null
  quote?: string | null; source?: string; marks?: number | null; index?: number
}) {
  const [answer, setAnswer] = useState('')
  const [previous, setPrevious] = useState<string[]>([])
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [started] = useState(() => Date.now())
  const open = ladderOpen(result)
  const over = result !== null && !open
  const eliminated = new Set(result?.eliminated ?? [])

  const send = async (value: string) => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.quizAnswer(subjectId, { qid, answer: value, latency_ms: Date.now() - started, previous })
      if (r.signal === 'ATTEMPT') setPrevious((p) => [...p, value])
      setResult(r)
      if (ladderOpen(r) && kind !== 'MCQ') setAnswer('')
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-(--radius-card) border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        {index != null && <span className="font-bold text-muted">{index}.</span>}
        <p className="flex-1 text-lg font-semibold">{prompt}</p>
        {marks != null && <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-bold">{marks} mark{marks === 1 ? '' : 's'}</span>}
      </div>
      {kind === 'MCQ' && options?.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {options.map((o, i) => (
            <button key={o} disabled={over || busy || eliminated.has(o)} onClick={() => { setAnswer(o); void send(o) }}
                    className={`rounded-(--radius-ctl) border px-3 py-2 text-left ${over && result!.reveal === o ? 'border-ok bg-ok-soft' : answer === o && over ? 'border-accent bg-accent-soft' : 'border-line hover:bg-sunken'} ${eliminated.has(o) ? 'line-through opacity-35' : ''}`}>
              <span className="mr-2 font-bold text-muted">{String.fromCharCode(65 + i)}</span>{o}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <textarea rows={2} value={answer} readOnly={over} onChange={(e) => setAnswer(e.target.value)}
                    placeholder={open ? 'Try again with the hint' : 'Your answer'}
                    className="w-full rounded-(--radius-ctl) border border-line bg-bg p-2" />
          {!over && <Button size="sm" variant="primary" className="mt-2" disabled={busy} onClick={() => send(answer)}>{open ? 'Try again' : 'Check'}</Button>}
        </div>
      )}
      {open && <HintCard result={result!} />}
      {over && <WorkedAnswer result={result!} />}
      {error !== null && <div className="mt-3"><ErrorBox error={error} /></div>}
      {quote && over && <p className="mt-2 text-xs text-muted">Built from: “{quote}” · {source}</p>}
    </div>
  )
}
