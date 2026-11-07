// Session runner: LOADING → ITEM → (feedback) → ITEM … → BREAK? → PROBE → FELT_RATING → RESULT (brief M2).
import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { isDone, METHOD_LABEL, type FeynmanResult, type Intervention, type Item, type ProbeBody, type SessionResult } from '../api/types'
import { PageShell } from '../components/PageShell'
import { BreakModal } from '../components/session/BreakModal'
// The ElevenLabs SDK is most of the bundle; load it only when a Feynman item appears.
const Feynman = lazy(() => import('../components/session/Feynman').then((m) => ({ default: m.Feynman })))
import { FocusBar, useSessionTimer } from '../components/session/FocusBar'
import { ItemView } from '../components/session/ItemView'
import { Probe } from '../components/session/Probe'
import { QuestionCapture } from '../components/session/QuestionCapture'
import { Result } from '../components/session/Result'
import { Button, ButtonLink, Card, ErrorBox, Spinner } from '../components/ui'
import { useTelemetry } from '../hooks/useTelemetry'
import { getLocal, logActivity, setLocal, todayKey, useLocal } from '../lib/local'
import { useStartSession } from '../lib/useStartSession'

type Phase = 'loading' | 'item' | 'finishing' | 'probe' | 'result'

export function SessionPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const resume = useLocal((s) => s.resume)
  // Decide once per session id: finishing clears `resume`, and the Result must stay on screen.
  const [openedHere, setOpenedHere] = useState<{ id: number; ok: boolean }>(() => ({ id: sessionId, ok: resume?.session.id === sessionId }))
  if (openedHere.id !== sessionId) setOpenedHere({ id: sessionId, ok: resume?.session.id === sessionId })
  const ok = openedHere.id === sessionId ? openedHere.ok : resume?.session.id === sessionId

  if (!ok) {
    return (
      <PageShell where="Session">
        <Card className="max-w-lg">
          <h1 className="text-2xl font-extrabold">This session isn't open here.</h1>
          <p className="mt-2 text-muted">It may have finished already or been started on another device. Choose a subject to start again.</p>
          <ButtonLink to="/study" className="mt-4 inline-block" variant="primary">Choose a subject</ButtonLink>
        </Card>
      </PageShell>
    )
  }
  return <Runner key={sessionId} />
}

function Runner() {
  const [resume] = useState(() => getLocal().resume!)
  const { session, subjectName } = resume
  const qc = useQueryClient()
  const navigate = useNavigate()
  const again = useStartSession()

  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<Item | null>(resume.currentItem ?? null)
  const [done, setDone] = useState(resume.itemsDone)
  const [probeItems, setProbeItems] = useState<Item[]>([])
  const [result, setResult] = useState<SessionResult | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [brk, setBrk] = useState<{ seconds: number; message: string } | null>(null)
  const [wrapUp, setWrapUp] = useState<string | null>(null)
  const [focusedMin, setFocusedMin] = useState(0)

  const onIntervention = useCallback((i: Intervention) => {
    if (i.type === 'BREAK') setBrk({ seconds: i.break_seconds ?? 180, message: i.message })
    else if (i.type === 'WRAP_UP') setWrapUp(i.message)
    else setToast(i.message)
  }, [])
  const tel = useTelemetry(session.id, onIntervention, brk !== null || phase === 'result')

  const timer = useSessionTimer(
    session.planned_minutes,
    brk !== null || phase === 'probe' || phase === 'result',
    useCallback(() => {
      const mins = getLocal().pomodoroBreak
      setBrk({ seconds: mins * 60, message: `Pomodoro done. ${mins} minutes off.` })
    }, []),
    useCallback(() => setWrapUp("That's your planned time. Finish this one, then do the quick check."), []),
    resume.elapsedSec ?? 0,
  )

  useEffect(() => {
    if (timer.elapsedSec % 5 === 0) save({ elapsedSec: timer.elapsedSec })
  }, [timer.elapsedSec]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Break events go to the attention engine; the timer pauses while it's open.
  const prevBrk = useRef(false)
  useEffect(() => {
    if (brk && !prevBrk.current) tel.emit('BREAK_START', { payload: { seconds: brk.seconds } })
    if (!brk && prevBrk.current) { tel.emit('BREAK_END'); void tel.flush() }
    prevBrk.current = brk !== null
  }, [brk, tel])

  const save = (patch: { itemsDone?: number; currentItem?: Item; elapsedSec?: number }) =>
    setLocal((s) => (s.resume ? { resume: { ...s.resume, ...patch, savedAt: new Date().toISOString() } } : {}))

  const toProbe = useCallback(async () => {
    setPhase('finishing')
    setWrapUp(null)
    try {
      await tel.flush()
      const r = await api.finish(session.id)
      setProbeItems(r.probe_items)
      setPhase('probe')
    } catch (e) {
      setError(e)
      setPhase('item')
    }
  }, [session.id, tel])

  const next = useCallback(async () => {
    setError(null)
    try {
      const n = await api.nextItem(session.id)
      if (isDone(n)) {
        save({ currentItem: undefined })
        await toProbe()
        return
      }
      setItem(n)
      save({ currentItem: n })
      setPhase('item')
    } catch (e) {
      setError(e)
    }
  }, [session.id, toProbe])

  // next-item advances the server's queue, so it must run once even under StrictMode's double mount.
  const fetchedFirst = useRef(false)
  useEffect(() => {
    if (fetchedFirst.current) return
    fetchedFirst.current = true
    if (item) setPhase('item')
    else void next()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const afterItem = () => {
    const n = done + 1
    setDone(n)
    save({ itemsDone: n, currentItem: undefined })
    setItem(null)
    void next()
  }

  const afterFeynman = (_r: FeynmanResult) => {
    save({ currentItem: undefined, itemsDone: done + 1 })
    void toProbe()
  }

  const submitProbe = async (body: ProbeBody) => {
    setBusy(true)
    setError(null)
    try {
      const r = await api.probe(session.id, body)
      const offMin = tel.offTaskTotal() / 60_000
      setFocusedMin(Math.max(0, r.active_minutes - offMin))
      setResult(r)
      setPhase('result')
      logActivity('SESSION', `${subjectName}: ${METHOD_LABEL[session.method]} · ${Math.round(r.probe_score * 5)}/5`)
      const s = getLocal()
      const isFrog = s.frogDate === todayKey() && s.frogSubjectId === session.subject_id
      if (isFrog && !s.activity.some((a) => a.date === todayKey() && a.kind === 'FROG')) {
        logActivity('FROG', `Ate the frog: ${subjectName}`)
      }
      setLocal({ resume: null })
      void qc.invalidateQueries()
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  const stepLabel =
    phase === 'probe' ? 'Quick check' : phase === 'result' ? 'Done' : item?.kind === 'FEYNMAN_BRIEF' ? 'Teaching Sam' : `Question ${done + 1}`

  return (
    <PageShell
      focus
      where={`${subjectName} · ${METHOD_LABEL[session.method]}`}
      status={[
        { label: 'Step', value: stepLabel },
      ]}
      next={phase === 'result' ? 'Dashboard' : phase === 'probe' ? 'Your result' : undefined}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {phase !== 'result' && <p className="text-sm text-muted">{session.reason}</p>}
          {phase !== 'result' && (
            <div className="ml-auto flex gap-2">
              {phase === 'item' && <Button size="sm" variant="ghost" onClick={toProbe}>Finish with the quick check</Button>}
              <Button size="sm" variant="ghost" onClick={() => navigate('/')}>Leave (progress saved)</Button>
            </div>
          )}
        </div>

        {phase !== 'result' && <FocusBar timer={timer} attention={tel.attention} />}

        {toast && (
          <div role="status" className="mb-4 rounded-(--radius-ctl) bg-ink px-4 py-3 font-semibold text-bg">{toast}</div>
        )}
        {wrapUp && phase === 'item' && (
          <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-(--radius-ctl) border border-ink px-4 py-3">
            <span className="font-semibold">{wrapUp}</span>
            <Button size="sm" variant="primary" className="ml-auto" onClick={toProbe}>Go to the quick check</Button>
          </div>
        )}
        {error !== null && <div className="mb-4"><ErrorBox error={error} onRetry={phase === 'probe' ? undefined : () => void next()} /></div>}

        {(phase === 'loading' || phase === 'finishing') && <Spinner label={phase === 'loading' ? 'Getting your first question' : 'Preparing the quick check'} />}

        {phase === 'item' && item && (
          item.kind === 'FEYNMAN_BRIEF'
            ? <Suspense fallback={<Spinner label="Loading the Feynman room" />}><Feynman sessionId={session.id} item={item} emit={tel.emit} onDone={afterFeynman} /></Suspense>
            : <ItemView key={item.id} sessionId={session.id} item={item} itemShown={tel.itemShown} itemAnswered={tel.itemAnswered} onNext={afterItem} />
        )}

        {phase === 'probe' && <Probe items={probeItems} onSubmit={submitProbe} busy={busy} error={error} />}

        {phase === 'result' && result && (
          <Result result={result} focusedMin={focusedMin} subjectName={subjectName} onAgain={() => again.mutate({ subjectId: session.subject_id, subjectName })} />
        )}

        {phase !== 'result' && (
          <div className="mt-10">
            <QuestionCapture subjectId={session.subject_id} subjectName={subjectName} context={item?.prompt} />
          </div>
        )}
      </div>

      {brk && <BreakModal seconds={brk.seconds} message={brk.message} onEnd={() => setBrk(null)} />}
    </PageShell>
  )
}
