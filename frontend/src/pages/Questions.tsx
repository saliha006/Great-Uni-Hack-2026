// Inbox for "didn't get it" questions captured during sessions or lectures.
import { useState } from 'react'
import { PageShell } from '../components/PageShell'
import { Button, Card, Chip } from '../components/ui'
import { addQuestion, logActivity, setLocal, useLocal, type Question } from '../lib/local'

export function Questions() {
  const questions = useLocal((s) => s.questions)
  const [show, setShow] = useState<'open' | 'resolved'>('open')
  const [draft, setDraft] = useState('')
  const open = questions.filter((q) => !q.resolved)
  const resolved = questions.filter((q) => q.resolved)
  const shown = show === 'open' ? open : resolved

  return (
    <PageShell where="Questions">
      <h1 className="text-2xl font-extrabold tracking-tight">Your questions</h1>
      <p className="mt-1 text-muted">Save a question now. Come back to it when you're ready.</p>

      <form
        className="mt-6 flex max-w-2xl flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim()) { addQuestion(draft.trim()); setDraft('') }
        }}
      >
        <label htmlFor="new-q" className="w-full text-sm font-semibold">What would you like to understand?</label>
        <input id="new-q" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your question…" className="min-h-11 min-w-0 flex-1 rounded-(--radius-ctl) border border-line bg-surface px-3" />
        <Button variant="primary" type="submit" disabled={!draft.trim()}>Add</Button>
      </form>

      <div role="tablist" aria-label="Filter" className="mt-6 flex gap-2">
        {(['open', 'resolved'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={show === t} onClick={() => setShow(t)} className={`rounded-(--radius-ctl) px-3 py-2 text-sm font-semibold ${show === t ? 'bg-ink text-bg' : 'hover:bg-sunken'}`}>
            {t === 'open' ? `Open (${open.length})` : `Answered (${resolved.length})`}
          </button>
        ))}
      </div>

      <ul className="mt-4 space-y-3">
        {shown.map((q) => <QuestionRow key={q.id} q={q} />)}
      </ul>
      {!shown.length && (
        <p className="mt-6 text-muted">
          {show === 'open' ? 'No open questions. During a session, press Q to save one without losing your place.' : 'Answered questions show up here.'}
        </p>
      )}
    </PageShell>
  )
}

function QuestionRow({ q }: { q: Question }) {
  const [answer, setAnswer] = useState(q.answer ?? '')
  const [editing, setEditing] = useState(false)
  const resolve = () => {
    setLocal((s) => ({ questions: s.questions.map((x) => (x.id === q.id ? { ...x, resolved: true, answer: answer.trim() || undefined } : x)) }))
    logActivity('QUESTION_RESOLVED', `Answered: ${q.text.split('\n')[0].slice(0, 60)}`)
  }
  return (
    <li>
      <Card as="article">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {q.subjectName && <Chip>{q.subjectName}</Chip>}
          <span>{new Date(q.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="mt-2 whitespace-pre-line text-lg">{q.text}</p>
        {q.resolved ? (
          q.answer && <p className="mt-2 rounded-(--radius-ctl) bg-ok-soft p-3"><span className="font-semibold">Answer: </span>{q.answer}</p>
        ) : editing ? (
          <div className="mt-3">
            <label htmlFor={`ans-${q.id}`} className="font-semibold">What's the answer?</label>
            <textarea id={`ans-${q.id}`} rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} className="mt-1 w-full rounded-(--radius-ctl) border border-line bg-bg p-2" />
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="primary" onClick={resolve}>Mark answered</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => setEditing(true)}>Add the answer</Button>
            <Button size="sm" variant="ghost" onClick={resolve}>Mark answered</Button>
          </div>
        )}
      </Card>
    </li>
  )
}
