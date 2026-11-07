// Study tools: quizzes, flashcards and practice papers, all built from the student's notes.
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { StudyItem, StudyKind } from '../api/types'
import { PageShell } from '../components/PageShell'
import { QuizCard } from '../components/QuizCard'
import { TutorChat } from '../components/TutorChat'
import { Card, ErrorBox, Spinner } from '../components/ui'

const TABS: { kind: StudyKind; label: string; blurb: string }[] = [
  { kind: 'quiz', label: 'Quiz', blurb: 'Mixed questions across all your notes. Wrong answers get hints, not the answer.' },
  { kind: 'flashcards', label: 'Flashcards', blurb: 'Try to recall it, then flip. Each card shows the line in your notes it came from.' },
  { kind: 'paper', label: 'Practice paper', blurb: 'An exam-style paper in sections, with marks and a suggested time.' },
]

export function Tools() {
  const [params, setParams] = useSearchParams()
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
  const subjectId = Number(params.get('subject')) || subjects.data?.[0]?.subject.id
  const kind = (params.get('kind') as StudyKind) || 'quiz'
  const set = useQuery({
    queryKey: ['study-set', subjectId, kind],
    queryFn: () => api.studySet(subjectId!, kind),
    enabled: !!subjectId,
  })
  const pick = (patch: Record<string, string>) => setParams({ ...Object.fromEntries(params), ...patch })

  return (
    <PageShell where="Study tools">
      <h1 className="text-3xl font-extrabold">Study tools</h1>
      <p className="mt-1 text-muted">Made from your notes, never from thin air: every question points to the line it came from.</p>
      <div className="mt-4 flex flex-wrap items-center gap-2" data-tour="tools">
        {TABS.map((t) => (
          <button key={t.kind} onClick={() => pick({ kind: t.kind })}
                  className={`rounded-full px-4 py-2 font-semibold ${kind === t.kind ? 'bg-ink text-bg' : 'border border-line hover:bg-sunken'}`}>{t.label}</button>
        ))}
        {(subjects.data?.length ?? 0) > 1 && (
          <select value={subjectId} onChange={(e) => pick({ subject: e.target.value })} className="ml-auto rounded-(--radius-ctl) border border-line bg-surface px-3 py-2">
            {subjects.data!.map((s) => <option key={s.subject.id} value={s.subject.id}>{s.subject.name}</option>)}
          </select>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">{TABS.find((t) => t.kind === kind)!.blurb}</p>

      {!subjectId && !subjects.isPending && <Card className="mt-6">Add a subject or load the demo student first.</Card>}
      {set.isPending && subjectId && <Spinner label="Building from your notes" />}
      {set.error && <div className="mt-6"><ErrorBox error={set.error} onRetry={() => set.refetch()} /></div>}
      {set.data && (
        <section className="mt-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-bold">{set.data.title}</h2>
            <span className="text-sm text-muted">{set.data.items.length} items · about {set.data.minutes} min</span>
          </div>
          <div className="mt-4">
            {kind === 'flashcards' ? <Flashcards items={set.data.items} /> : <Questions subjectId={subjectId!} items={set.data.items} paper={kind === 'paper'} />}
          </div>
        </section>
      )}
      {subjectId && <TutorChat subjectId={subjectId} />}
    </PageShell>
  )
}

function Questions({ subjectId, items, paper }: { subjectId: number; items: StudyItem[]; paper: boolean }) {
  let section: string | null | undefined = null
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const heading = paper && it.section !== section ? it.section : null
        section = it.section
        return (
          <div key={it.qid}>
            {heading && <h3 className="mb-2 mt-6 text-lg font-extrabold">Section {heading}</h3>}
            <QuizCard subjectId={subjectId} index={i + 1} qid={it.qid} kind={it.kind} prompt={it.prompt} options={it.options}
                      quote={it.quote} source={it.source} marks={paper ? it.marks : null} />
          </div>
        )
      })}
    </div>
  )
}

function Flashcards({ items }: { items: StudyItem[] }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = items[i]
  if (!card) return <p className="text-muted">No cards yet.</p>
  const go = (d: number) => { setFlipped(false); setI((i + d + items.length) % items.length) }
  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => setFlipped((f) => !f)} aria-label={flipped ? 'Show question' : 'Flip to see the answer'}
              className="grid min-h-64 w-full place-items-center rounded-[22px] border border-line bg-surface p-8 text-center shadow-lg transition-transform duration-300 hover:-translate-y-0.5">
        {flipped ? (
          <div>
            <p className="text-xs font-bold uppercase text-muted">Answer</p>
            <p className="mt-2 text-2xl font-bold">{card.back}</p>
            {card.quote && <p className="mt-4 text-sm italic text-muted">“{card.quote}” · {card.source}</p>}
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold uppercase text-muted">Recall it, then tap to flip</p>
            <p className="mt-2 text-2xl font-bold">{card.prompt}</p>
          </div>
        )}
      </button>
      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => go(-1)} className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-sunken">← Previous</button>
        <span className="text-sm text-muted">Card {i + 1} of {items.length}</span>
        <button onClick={() => go(1)} className="rounded-full border border-line px-4 py-2 font-semibold hover:bg-sunken">Next →</button>
      </div>
    </div>
  )
}
