// Standard Probe: same 5-item check for every method, then "how did that feel?" (PRD §6 F4).
import { useRef, useState } from 'react'
import type { Item, ProbeBody } from '../../api/types'
import { Button, ErrorBox } from '../ui'

const FEELINGS: { v: ProbeBody['felt_rating']; face: string; label: string }[] = [
  { v: 1, face: '😣', label: 'Rough' },
  { v: 2, face: '😕', label: 'Hard going' },
  { v: 3, face: '😐', label: 'Okay' },
  { v: 4, face: '🙂', label: 'Good' },
  { v: 5, face: '😄', label: 'Great' },
]

export function Probe({ items, onSubmit, busy, error }: { items: Item[]; onSubmit: (b: ProbeBody) => void; busy: boolean; error: unknown }) {
  const started = useRef(Date.now())
  const [answers, setAnswers] = useState<Record<number, { answer: string; at: number }>>({})
  const [felt, setFelt] = useState<ProbeBody['felt_rating'] | null>(null)
  const set = (id: number, answer: string) => setAnswers((a) => ({ ...a, [id]: { answer, at: Date.now() } }))
  const answered = items.filter((i) => answers[i.id]?.answer.trim()).length

  const submit = () => {
    if (!felt) return
    onSubmit({
      answers: items.map((i) => ({ item_id: i.id, answer: answers[i.id]?.answer ?? '', latency_ms: (answers[i.id]?.at ?? Date.now()) - started.current })),
      felt_rating: felt,
    })
  }

  return (
    <div>
      <h2 className="text-3xl font-extrabold">Quick check</h2>
      <p className="mt-1 text-muted">Five questions, same for every method, so methods are compared fairly. {answered} of {items.length} answered.</p>
      <ol className="mt-6 space-y-6">
        {items.map((it, n) => (
          <li key={it.id}>
            <p className="text-lg font-semibold">{n + 1}. {it.prompt}</p>
            {it.options?.length ? (
              <fieldset className="mt-2 grid gap-2 sm:grid-cols-2">
                <legend className="sr-only">Options for question {n + 1}</legend>
                {it.options.map((o) => (
                  <label key={o} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-(--radius-ctl) border px-3 py-2 ${answers[it.id]?.answer === o ? 'border-ink bg-sunken' : 'border-line bg-surface'}`}>
                    <input type="radio" name={`p-${it.id}`} value={o} checked={answers[it.id]?.answer === o} onChange={() => set(it.id, o)} />
                    {o}
                  </label>
                ))}
              </fieldset>
            ) : (
              <textarea
                aria-label={`Answer to question ${n + 1}`}
                rows={2}
                value={answers[it.id]?.answer ?? ''}
                onChange={(e) => set(it.id, e.target.value)}
                className="mt-2 w-full rounded-(--radius-ctl) border border-line bg-surface p-2.5"
              />
            )}
          </li>
        ))}
      </ol>

      <fieldset className="mt-8">
        <legend className="text-lg font-semibold">How did that session feel?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEELINGS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFelt(f.v)}
              aria-pressed={felt === f.v}
              className={`flex min-w-20 flex-col items-center rounded-(--radius-ctl) border px-3 py-2 ${felt === f.v ? 'border-ink bg-sunken' : 'border-line bg-surface hover:bg-sunken'}`}
            >
              <span aria-hidden className="text-2xl">{f.face}</span>
              <span className="text-sm">{f.label}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {error !== null && <div className="mt-4"><ErrorBox error={error} onRetry={submit} /></div>}
      <Button variant="primary" size="lg" className="mt-6" onClick={submit} disabled={!felt || busy}>
        {busy ? 'Scoring…' : felt ? 'See my result' : 'Pick how it felt to finish'}
      </Button>
    </div>
  )
}
