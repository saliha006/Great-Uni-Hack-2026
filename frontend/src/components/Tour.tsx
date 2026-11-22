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

const ADA_INSIGHTS = ({ subjectId }: Ctx) => `/insights/${subjectId}`

const STEPS: Step[] = [
  {
    title: 'Explore Ada’s study plan',
    note: 'Ada studies Data Structures. Load her sample history to see how Attune compares methods, responds to fatigue, and tests a change in plan.',
    cta: {
      label: 'Load Ada',
      done: 'Ada’s calibration and first weekly reflection are ready.',
      run: async () => {
        const r = await api.devSeed('ada')
        setLocal({ seededFlag: true, resume: null })
        return ADA_INSIGHTS({ subjectId: r.subject_ids[0] })
      },
    },
  },
  {
    title: 'Compare the three methods',
    note: 'Ada took the same five-question Quick Check after Active Recall, Practice Test and Feynman. Compare their estimated fit and uncertainty in the methods chart. In her first weekly reflection, Attune shortens sessions while her focus recovers.',
    enter: async (ctx) => ADA_INSIGHTS(ctx),
  },
  {
    title: 'See why Attune starts a trial',
    note: 'Skip one week of the sample history. Ada’s scores have levelled off on Practice Test even though her focus recovered. Attune starts a seven-day Feynman trial.',
    cta: {
      label: 'Advance 7 days',
      done: 'The latest sample reflection shows why Attune starts the Feynman trial.',
      run: async (ctx) => {
        await api.devAdvanceDays(7)
        return ADA_INSIGHTS(ctx)
      },
    },
  },
  {
    title: 'See whether the trial worked',
    note: 'Compare Ada’s Feynman scores from the trial with her recent Practice Test scores. The plan keeps the trial method when the average score rises by at least five percentage points.',
    cta: {
      label: 'Advance 7 more days',
      done: 'The trial result is in the latest sample reflection.',
      run: async (ctx) => {
        await api.devAdvanceDays(7)
        return ADA_INSIGHTS(ctx)
      },
    },
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
  const completed = i === STEPS.length - 1 && done
  return (
    <aside aria-labelledby="demo-step" className="relative z-20 mx-auto w-full max-w-6xl px-4 pt-4">
      <div className="rounded-(--radius-card) border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="mr-auto text-sm font-semibold text-muted">Guided demo · Demo data</p>
          <button type="button" onClick={openTour} className="text-sm font-semibold underline">Replay</button>
          <button type="button" onClick={leaveTour} className="text-sm font-semibold underline">Leave demo</button>
        </div>
        <h2 id="demo-step" className="mt-2 text-xl font-extrabold" aria-live="polite">{step.title}</h2>
        <p className="mt-2 max-w-3xl leading-relaxed">{step.note}</p>
        {i === 0 && (
          <p className="mt-2 text-sm text-muted">Runs in this browser tab. Tutor chat, generated study tools and voice need the live backend.</p>
        )}
        {cta && done && <p className="mt-2 font-semibold text-ok" role="status">{cta.done}</p>}
        {error && <p className="mt-3 rounded-(--radius-ctl) bg-warn-soft px-3 py-2" role="alert">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {cta && !done && (
            <Button variant="primary" disabled={busy} onClick={() => run(cta.run, i)}>
              {busy ? 'Working…' : cta.label}
            </Button>
          )}
          {completed && (
            <>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => navigate(ADA_INSIGHTS(ctx))}>Ada’s insights</Button>
              <Button size="sm" disabled={busy} onClick={() => run(({ subjectId }) => openSession(subjectId, 'PRACTICE_TEST'))}>Try Practice Test</Button>
              <Button size="sm" disabled={busy} onClick={() => run(({ subjectId }) => openSession(subjectId, 'FEYNMAN'))}>Try typed Feynman</Button>
            </>
          )}
          <div className="ml-auto flex gap-2">
            {i > 0 && <Button size="sm" variant="ghost" disabled={busy} onClick={() => go(i - 1)}>Back</Button>}
            {i < STEPS.length - 1
              ? <Button size="sm" variant="primary" disabled={busy || (cta !== undefined && !done)} onClick={() => go(i + 1)}>Next</Button>
              : <Button size="sm" variant="primary" disabled={busy || !done} onClick={leaveTour}>Finish</Button>}
          </div>
        </div>
      </div>
    </aside>
  )
}
