// Guided demo: Next / Back walks through the pitch, moving to the right screen with a short note at each step.
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Method } from '../api/types'
import { setLocal } from '../lib/local'
import { leaveTour, openTour, TOUR_STORAGE_KEY } from '../lib/workspace'
import { Button } from './ui'

type Ctx = { subjectId: number }
interface Step {
  title: string
  note: string
  // Runs when the step opens; returns where to go.
  enter?: (ctx: Ctx) => Promise<string | void>
  cta?: { label: string; run: (ctx: Ctx) => Promise<string | void>; done: string }
}

async function openSession(subjectId: number, method: Method): Promise<string> {
  const session = await api.createSession({ subject_id: subjectId, method })
  setLocal({ resume: { session, subjectName: 'Data Structures', itemsDone: 0, savedAt: new Date().toISOString() } })
  return `/session/${session.id}`
}

const STEPS: Step[] = [
  {
    title: 'Nobody teaches you how to learn',
    note: 'At school, revision is planned for you. At uni it isn\'t, and the old way of winging it quietly stops working. Students who did brilliantly at A-level drop off, not because they aren\'t smart, but because nobody showed them how to learn.',
    enter: async () => '/',
  },
  {
    title: 'Same hours. Very different results.',
    note: 'Six hours of rereading can teach less than two hours of the right method. Which method is right depends on you and on the subject, so Attune tests methods on you instead of guessing. Let\'s load Ada, a demo student (seeded data, labelled as such).',
    cta: {
      label: 'Load Ada',
      done: 'Ada is loaded.',
      run: async () => {
        const r = await api.devSeed('ada')
        setLocal({ seededFlag: true, resume: null })
        return `/insights/${r.subject_ids[0]}`
      },
    },
  },
  {
    title: 'Find: the method that works for you',
    note: 'Ada tried Active Recall, Practice Test and Feynman, each scored on the same 5-question check so the comparison is fair. For this subject, Practice Test teaches her the most per minute. The whiskers show how sure it is so far.',
    enter: async ({ subjectId }) => `/insights/${subjectId}`,
  },
  {
    title: 'Fix: it works out why you stalled',
    note: 'Tired, away, stuck or already mastered each need a different fix. Ada had a tired spell, so her sessions got shorter. Now skip a week: her focus is fine but scores are flat. That\'s a plateau, not tiredness.',
    cta: {
      label: 'Advance 7 days',
      done: 'Plateau found: a one-week Feynman trial starts, kept only if scores rise. See the new reflection below.',
      run: async ({ subjectId }) => {
        await api.devAdvanceDays(7)
        return `/insights/${subjectId}`
      },
    },
  },
  {
    title: 'Follow your focus, in real time',
    note: 'Try a practice test with Ada’s sample questions. Attune uses answer timing to help you notice when your focus starts slipping.',
    enter: ({ subjectId }) => openSession(subjectId, 'PRACTICE_TEST'),
  },
  {
    title: 'Ask your notes',
    note: 'In a live study session, the tutor answers with quotes from your notes. It can give hints for a question you’re working on or make a quiz for more practice.',
  },
  {
    title: 'Teach it back to Sam',
    note: 'Type an explanation for Sam, a student learning the topic. In a live session with voice enabled, you can speak your explanation too.',
    enter: ({ subjectId }) => openSession(subjectId, 'FEYNMAN'),
  },
  {
    title: 'Quizzes, flashcards, practice papers',
    note: 'In the live workspace, Attune builds these from your notes. Each question shows the passage it came from.',
    enter: async ({ subjectId }) => `/tools?subject=${subjectId}&kind=paper`,
  },
  {
    title: 'Learn how you learn. And keep checking.',
    note: 'Rules make every decision from your own data; the AI only explains and marks, and its claims are quote-checked. Attention-aware, not medical: it never diagnoses anything.',
    enter: async () => '/',
  },
]

type TourProgress = { step: number; completed: number[] }

function readProgress(): TourProgress {
  try {
    const raw = sessionStorage.getItem(TOUR_STORAGE_KEY)
    if (raw) {
      const { step, completed } = JSON.parse(raw) as TourProgress
      if (Number.isInteger(step) && step >= 0 && step < STEPS.length && Array.isArray(completed)) {
        return { step, completed }
      }
    }
  } catch { /* start at the first step when progress is unavailable */ }
  return { step: 0, completed: [] }
}

export function Tour() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [progress, setProgress] = useState(readProgress)
  const i = progress.step
  const [ctx, setCtx] = useState<Ctx>({ subjectId: 1 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try { sessionStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(progress)) } catch { /* keep progress in memory */ }
  }, [progress])

  const run = async (fn: (c: Ctx) => Promise<string | void>, completeStep?: number) => {
    setBusy(true)
    setError(null)
    try {
      const to = await fn(ctx)
      const seeded = to?.match(/^\/insights\/(\d+)/)
      if (seeded) setCtx({ subjectId: Number(seeded[1]) })
      await qc.invalidateQueries()
      if (to) navigate(to)
      if (completeStep !== undefined) {
        setProgress((p) => ({ ...p, completed: [...p.completed, completeStep] }))
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const go = (n: number) => {
    setError(null)
    setProgress((p) => ({ ...p, step: n }))
    const enter = STEPS[n].enter
    if (enter) void run(enter)
  }

  const step = STEPS[i]
  const cta = step.cta
  const done = progress.completed.includes(i)
  return (
    <div role="dialog" aria-label="Guided demo" className="fixed bottom-5 left-5 z-50 w-[min(28rem,calc(100vw-2.5rem))] rounded-[22px] border border-ink/15 bg-surface/90 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted">
        <span aria-hidden className="size-2 rounded-full bg-interaction" /> Guided demo · {i + 1} of {STEPS.length}
        <button type="button" onClick={openTour} className="ml-auto font-semibold normal-case underline">Replay</button>
        <button type="button" onClick={leaveTour} className="font-semibold normal-case underline">Leave demo</button>
      </div>
      <h2 className="mt-2 text-xl font-extrabold leading-tight">{step.title}</h2>
      <p className="mt-2 leading-relaxed">{step.note}</p>
      {cta && !done && (
        <Button variant="primary" className="mt-3" disabled={busy} onClick={() => run(cta.run, i)}>
          {busy ? 'Working…' : cta.label}
        </Button>
      )}
      {cta && done && <p className="mt-3 rounded-(--radius-ctl) bg-ok-soft px-3 py-2 font-semibold" role="status">{cta.done}</p>}
      {error && <p className="mt-3 rounded-(--radius-ctl) bg-warn-soft px-3 py-2" role="alert">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-1" aria-hidden>
          {STEPS.map((_, n) => <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-5 bg-ink' : 'w-1.5 bg-line'}`} />)}
        </div>
        <div className="ml-auto flex gap-2">
          {i > 0 && <Button size="sm" variant="ghost" disabled={busy} onClick={() => go(i - 1)}>Back</Button>}
          {i < STEPS.length - 1
            ? <Button size="sm" variant="primary" disabled={busy || (cta !== undefined && !done)} onClick={() => go(i + 1)}>Next</Button>
            : <Button size="sm" variant="primary" onClick={leaveTour}>Finish</Button>}
        </div>
      </div>
    </div>
  )
}
