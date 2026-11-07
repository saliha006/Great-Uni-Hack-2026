// "Ask your notes": a tutor that answers only with quotes from the student's own notes.
import { useState } from 'react'
import { api } from '../api/client'
import type { AskResult } from '../api/types'
import { QuizCard } from './QuizCard'
import { Button } from './ui'

type Turn = { q: string; a: AskResult }

export function TutorChat({ subjectId, sessionId }: { subjectId: number; sessionId?: number }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)

  const ask = async (q: string) => {
    if (!q.trim()) return
    setBusy(true)
    try {
      const a = await api.ask(subjectId, q, sessionId)
      setTurns((t) => [...t, { q, a }])
      setText('')
    } catch (e) {
      setTurns((t) => [...t, { q, a: { intent: 'NOT_IN_NOTES', message: (e as Error).message, answer: [] } }])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} data-tour="tutor"
              className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-bg shadow-lg">
        <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-interaction" /> Ask your notes
      </button>
    )
  }
  return (
    <aside aria-label="Tutor" className="fixed bottom-5 right-5 z-40 flex max-h-[80vh] w-[min(26rem,calc(100vw-2.5rem))] flex-col rounded-[22px] border border-line bg-surface shadow-2xl">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span aria-hidden className="size-2.5 rounded-full bg-interaction" />
        <div className="flex-1">
          <p className="font-bold">Ask your notes</p>
          <p className="text-xs text-muted">Every answer quotes your notes. It won't hand you the question you're on.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 && (
          <div className="space-y-2 text-sm">
            <p className="text-muted">Try:</p>
            {['Why are collisions unavoidable?', 'Quiz me', 'Just give me the answer'].map((s) => (
              <button key={s} onClick={() => ask(s)} className="mr-2 rounded-full border border-line px-3 py-1 hover:bg-sunken">{s}</button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-8 rounded-(--radius-ctl) bg-ink px-3 py-2 text-right text-bg">{t.q}</p>
            {t.a.message && <p className="rounded-(--radius-ctl) bg-sunken px-3 py-2">{t.a.message}</p>}
            {t.a.answer.map((s, j) => (
              <div key={j} className="rounded-(--radius-ctl) bg-sunken px-3 py-2">
                <p>{s.text}</p>
                <blockquote className="mt-1 border-l-4 border-accent pl-2 text-sm italic">“{s.quote}” <span className="not-italic text-muted">· {s.label}</span></blockquote>
              </div>
            ))}
            {t.a.hint && (
              <div className="rounded-(--radius-ctl) bg-accent-soft px-3 py-2">
                <p className="text-sm font-semibold">Hint instead</p>
                <p>{t.a.hint.text}</p>
                {t.a.hint.quote && <blockquote className="mt-1 border-l-4 border-accent pl-2 italic">{t.a.hint.quote}</blockquote>}
              </div>
            )}
            {t.a.quiz?.map((q, j) => <QuizCard key={q.qid} subjectId={subjectId} index={j + 1} {...q} />)}
            {t.a.grounded_by === 'extractive' && <p className="text-xs text-muted">Quoted straight from your notes (AI offline).</p>}
          </div>
        ))}
      </div>
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void ask(text) }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ask about your notes, or say “quiz me”"
               className="flex-1 rounded-(--radius-ctl) border border-line bg-bg px-3 py-2" />
        <Button variant="primary" disabled={busy || !text.trim()}>{busy ? '…' : 'Ask'}</Button>
      </form>
    </aside>
  )
}
