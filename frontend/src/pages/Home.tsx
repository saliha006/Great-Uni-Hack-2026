import { useQueries, useQuery } from '@tanstack/react-query'
import { api, clockNow } from '../api/client'
import { METHOD_LABEL, type SubjectSummary } from '../api/types'
import { PageShell } from '../components/PageShell'
import { ReflectionCard } from '../components/ReflectionCard'
import { Button, ButtonLink, Card, Chip, ErrorBox, Meter, Spinner } from '../components/ui'
import { setLocal, todayKey, useLocal } from '../lib/local'
import { useStartSession } from '../lib/useStartSession'

const readinessScore = (s: SubjectSummary) => {
  const r = s.readiness
  if (!r) return 0.5
  const xs = [r.performance, r.understanding].filter((x): x is number => x !== null)
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5
}
const daysUntil = (date?: string | null) =>
  date ? Math.ceil((Date.parse(date) - Date.parse(clockNow())) / 86_400_000) : null

// Eat the frog: the hardest thing first. Suggest the least-ready subject, nearest exam breaks ties.
function suggestFrog(subjects: SubjectSummary[]): SubjectSummary | undefined {
  return [...subjects].sort(
    (a, b) => readinessScore(a) - readinessScore(b) || (daysUntil(a.subject.exam_date) ?? 999) - (daysUntil(b.subject.exam_date) ?? 999),
  )[0]
}

export function Home() {
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
  const reflections = useQueries({
    queries: (subjects.data ?? []).map((s) => ({ queryKey: ['reflections', s.subject.id], queryFn: () => api.reflections(s.subject.id) })),
  })
  const start = useStartSession()
  const today = todayKey()
  const { frogSubjectId, frogDate, frogSkipped, resume } = useLocal((s) => ({
    frogSubjectId: s.frogSubjectId,
    frogDate: s.frogDate,
    frogSkipped: s.frogSkipped,
    resume: s.resume,
  }))

  const list = subjects.data ?? []
  const chosen = frogDate === today ? list.find((s) => s.subject.id === frogSubjectId) : undefined
  const frog = frogSkipped === today ? undefined : chosen ?? suggestFrog(list)
  const frogEaten = useLocal((s) => s.activity.some((a) => a.date === today && a.kind === 'FROG'))
  const others = list.filter((s) => s.subject.id !== frog?.subject.id)
  const latest = reflections
    .flatMap((q, i) => (q.data?.[0] ? [{ r: q.data[0], name: list[i]?.subject.name }] : []))
    .sort((a, b) => Date.parse(b.r.ts) - Date.parse(a.r.ts))[0]

  const startSubject = (s: SubjectSummary) => start.mutate({ subjectId: s.subject.id, subjectName: s.subject.name })

  return (
    <PageShell where="Study">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Study</h1>
      {subjects.isPending && <Spinner label="Loading your subjects" />}
      {subjects.isError && <ErrorBox error={subjects.error} onRetry={() => subjects.refetch()} />}
      {start.isError && <div className="mb-4"><ErrorBox error={start.error} /></div>}

      {subjects.isSuccess && list.length === 0 && (
        <Card className="max-w-xl">
          <h2 className="text-2xl font-extrabold">What are you studying?</h2>
          <p className="mt-2 text-muted">Add a subject and your notes. Try three short sessions to find a study method that helps.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink to="/onboarding" variant="primary" size="lg">Add a subject</ButtonLink>
            <ButtonLink to="/dev">Load the demo student</ButtonLink>
          </div>
        </Card>
      )}

      {resume && (
        <Card className="mb-6 flex flex-wrap items-center gap-4 bg-sunken">
          <div>
            <p className="text-sm text-muted">Continue where you stopped</p>
            <p className="text-lg font-bold">
              {resume.subjectName} · {METHOD_LABEL[resume.session.method]} · {resume.itemsDone} done
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => setLocal({ resume: null })}>Dismiss</Button>
            <ButtonLink to={`/session/${resume.session.id}`}>Continue</ButtonLink>
          </div>
        </Card>
      )}

      {frog && (
        <section aria-labelledby="frog-h" className="mb-6 rounded-(--radius-card) border border-line bg-surface p-5">
          <p className="text-sm text-muted">Suggested next step</p>
          <h2 id="frog-h" className="mt-1 text-2xl font-extrabold tracking-tight">{frog.subject.name}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {frogEaten ? 'You made progress here today. Continue or choose another subject.' : 'This subject could use some attention. Start here, or choose another.'}
          </p>
          <p className="mt-3 font-semibold">
            Next: {METHOD_LABEL[frog.plan.method]} · {frog.plan.session_minutes} min
          </p>
          <details className="mt-2 text-sm text-muted"><summary className="cursor-pointer">Why this session?</summary><p className="mt-2">{frog.plan.reason}</p></details>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={() => {
                setLocal({ frogSubjectId: frog.subject.id, frogDate: today })
                startSubject(frog)
              }}
              disabled={start.isPending}
            >
              {start.isPending ? 'Starting…' : 'Start session'}
            </Button>
            {list.length > 1 && (
              <label className="flex items-center gap-2 text-base">
                Subject:
                <select
                  className="rounded-(--radius-ctl) border border-line bg-surface px-2 py-2 text-ink"
                  value={frog.subject.id}
                  onChange={(e) => setLocal({ frogSubjectId: Number(e.target.value), frogDate: today })}
                >
                  {list.map((s) => (
                    <option key={s.subject.id} value={s.subject.id} className="text-ink">{s.subject.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="text-base underline" onClick={() => setLocal({ frogSkipped: today })}>Not today</button>
          </div>
        </section>
      )}

      {latest && <div className="mb-8"><ReflectionCard reflection={latest.r} subjectName={latest.name} /></div>}

      {others.length > 0 && (
        <section aria-labelledby="subjects-h">
          <h2 id="subjects-h" className="mb-3 text-xl font-bold">{frog ? 'Other subjects' : 'Your subjects'}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {others.map((s) => (
              <SubjectCard key={s.subject.id} s={s} onStart={() => startSubject(s)} starting={start.isPending} />
            ))}
          </div>
        </section>
      )}

      {list.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/onboarding">Add a subject</ButtonLink>
          {frogSkipped === today && <Button variant="ghost" onClick={() => setLocal({ frogSkipped: null })}>Show suggestion</Button>}
        </div>
      )}
    </PageShell>
  )
}

function SubjectCard({ s, onStart, starting }: { s: SubjectSummary; onStart: () => void; starting: boolean }) {
  const days = daysUntil(s.subject.exam_date)
  return (
    <Card as="article">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold">{s.subject.name}</h3>
        <Chip tone={s.subject.phase === 'SAMPLING' ? 'warn' : 'neutral'}>
          {s.subject.phase === 'SAMPLING' ? 'Trying methods' : s.plan.mode === 'TRIAL' ? 'Trying a new method' : 'Personal plan'}
        </Chip>
        {days !== null && <span className="ml-auto text-sm text-muted">Exam in {days} days</span>}
      </div>
      <p className="mt-3 font-semibold">
        Next: {METHOD_LABEL[s.plan.method]} · {s.plan.session_minutes} min
      </p>
      <p className="text-muted">{s.plan.reason}</p>
      <Meter className="mt-4" label="Readiness" value={s.readiness ? readinessScore(s) : null} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onStart} disabled={starting}>Start session</Button>
        <ButtonLink to={`/insights/${s.subject.id}`} variant="ghost">Insights</ButtonLink>
      </div>
    </Card>
  )
}
