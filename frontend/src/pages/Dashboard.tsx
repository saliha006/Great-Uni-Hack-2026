import { useQueries, useQuery } from '@tanstack/react-query'
import { api, clockNow } from '../api/client'
import { METHOD_LABEL, type SubjectSummary } from '../api/types'
import { ContributionGrid } from '../components/ContributionGrid'
import { PageShell } from '../components/PageShell'
import { ButtonLink, Card, ErrorBox, Spinner } from '../components/ui'
import { type DaySummary } from '../lib/activity'
import { todayKey, useLocal, type Resume } from '../lib/local'

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const readiness = (s: SubjectSummary) => {
  const values = [s.readiness?.performance, s.readiness?.understanding].filter((x): x is number => x !== null && x !== undefined)
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
}

export function Dashboard() {
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
  const list = subjects.data ?? []
  const insights = useQueries({ queries: list.map((s) => ({ queryKey: ['insights', s.subject.id], queryFn: () => api.insights(s.subject.id) })) })
  const { activity, questions, resume } = useLocal((s) => ({ activity: s.activity, questions: s.questions, resume: s.resume }))
  const today = todayKey()
  const now = new Date(clockNow())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12)
  const map = new Map<string, DaySummary>()
  const day = (key: string) => map.get(key) ?? (map.set(key, { date: key, sessions: 0, tasks: 0, labels: [] }), map.get(key)!)
  let sessions = 0
  let focusMinutes = 0
  const dailyStudy = new Map<string, { minutes: number; tasks: number; sessions: number }>()
  const metricDay = (key: string) => dailyStudy.get(key) ?? (dailyStudy.set(key, { minutes: 0, tasks: 0, sessions: 0 }), dailyStudy.get(key)!)
  insights.forEach((query, i) => {
    const subject = list[i]?.subject.name ?? 'Subject'
    for (const [method, points] of Object.entries(query.data?.method_series ?? {})) {
      for (const point of points) {
        const d = day(dayKey(point.ts)); d.sessions++; sessions++
        d.labels.push(`${subject}: ${METHOD_LABEL[method as keyof typeof METHOD_LABEL] ?? method} · check ${Math.round(point.probe_score * 5)}/5`)
      }
    }
    for (const session of query.data?.attention_by_session ?? []) {
      const key = dayKey(session.ts)
      const focusedShare = Math.max(0, 1 - session.drift_share - session.lapse_share)
      // §11 doesn't return active_minutes for attention_by_session yet, so the real API gets a 25 min guess per session.
      const estimate = session.active_minutes ?? 25
      const focused = focusedShare * estimate
      focusMinutes += focused
      metricDay(key).minutes += focused
      metricDay(key).sessions++
    }
  })
  for (const entry of activity) {
    if (entry.kind === 'SESSION') continue
    const d = day(entry.date); d.tasks++; d.labels.push(entry.label)
    metricDay(entry.date).tasks++
  }
  const answered = questions.filter((q) => q.resolved).length
  const loading = subjects.isPending || insights.some((q) => q.isPending)

  return <PageShell where="Dashboard">
    <Backdrop />
    <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-extrabold tracking-tight">Your progress</h1><p className="text-sm text-muted">A little at a time, at your pace.</p></div>
      {list.length === 0 && <ButtonLink to="/onboarding" variant="primary">Add a subject</ButtonLink>}
    </div>
    {subjects.isError && <ErrorBox error={subjects.error} onRetry={() => subjects.refetch()} />}
    {loading ? <Spinner label="Gathering your progress" /> : <>
      <section className="mb-3 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-2" aria-label="Progress at a glance">
        <Metric label="Est. focus time" value={`${Math.floor(focusMinutes / 60)}h ${Math.round(focusMinutes % 60)}m`} />
        <Metric label="Sessions" value={sessions} />
        <Metric label="Questions cleared" value={answered} />
        <Metric label="Small wins today" value={day(today).sessions + day(today).tasks} />
      </section>
      <section className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2" aria-label="Dashboard overview">
        <Card glass className="flex flex-col !p-4"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-bold">Time and effort</h2><span className="text-xs text-muted">Last 7 days</span></div><DailyEffort days={dailyStudy} endDate={now} /></Card>
        <Card glass className="flex flex-col !p-4"><div className="mb-2 flex items-baseline justify-between"><h2 className="font-bold">{now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><span className="text-xs text-muted">Daily activity</span></div><ContributionGrid days={map} start={monthStart} end={monthEnd} today={now} /></Card>
        <Card glass className="!p-4"><h2 className="mb-2 font-bold">Subjects in progress</h2><div className="max-h-36 space-y-2 overflow-y-auto">{list.map((s) => <div key={s.subject.id}><div className="flex justify-between text-sm"><span className="font-semibold">{s.subject.name}</span><span className="text-muted">{readiness(s) === null ? 'Not enough data' : `${Math.round(readiness(s)! * 100)}% readiness`}</span></div><div className="mt-1 h-1.5 rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${(readiness(s) ?? 0) * 100}%` }} /></div></div>)}{!list.length && <p className="text-sm text-muted">Add a subject to begin.</p>}</div></Card>
        <Card glass className="!p-4"><h2 className="mb-2 font-bold">Coming up next</h2><Upcoming list={list} resume={resume} /></Card>
      </section>
    </>}
  </PageShell>
}

// Soft misty backdrop for the glass cards, built from the theme colours so it follows light and dark.
function Backdrop() {
  const mix = (colour: string, pct: number, into = 'var(--color-bg)') => `color-mix(in srgb, ${colour} ${pct}%, ${into})`
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, var(--color-bg) 0%, ${mix('var(--color-accent)', 14)} 45%, ${mix('var(--color-accent)', 34)} 100%)` }} />
      <div className="absolute -left-[10%] top-[34%] h-24 w-[80%] rounded-full opacity-60 blur-3xl" style={{ background: 'var(--color-accent)' }} />
      <div className="absolute -right-[15%] top-[12%] h-20 w-[70%] rounded-full opacity-40 blur-3xl" style={{ background: 'var(--color-interaction)' }} />
      <div className="absolute -left-[20%] bottom-[8%] h-28 w-[110%] rounded-full opacity-50 blur-3xl" style={{ background: 'var(--color-accent)' }} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xs text-muted">{label}</p><p className="text-xl font-bold">{value}</p></div>
}

function Upcoming({ list, resume }: { list: SubjectSummary[]; resume: Resume | null }) {
  const nearest = list.filter((s) => s.subject.exam_date && Date.parse(s.subject.exam_date) >= Date.parse(clockNow()) - 86400000).sort((a, b) => Date.parse(a.subject.exam_date!) - Date.parse(b.subject.exam_date!))[0]
  const date = nearest ? new Date(`${nearest.subject.exam_date!.slice(0, 10)}T12:00:00`) : null
  return <>
    {nearest && date ? <>
      <p className="text-xs uppercase tracking-wide text-muted">Nearest exam · {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
      <p className="mt-1 text-lg font-bold">{nearest.subject.name}</p>
      <p className="text-sm text-muted">{Math.max(0, Math.ceil((date.getTime() - Date.parse(clockNow())) / 86400000))} days to prepare</p>
    </> : <p className="text-sm text-muted">No upcoming exam dates.</p>}
    {resume && <ButtonLink to={`/session/${resume.session.id}`} size="sm" className="mt-2">Resume {resume.subjectName}</ButtonLink>}
  </>
}

function DailyEffort({ days, endDate }: { days: Map<string, { minutes: number; tasks: number; sessions: number }>; endDate: Date }) {
  const chartDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(endDate)
    date.setDate(date.getDate() - (6 - i))
    const key = dayKey(date.toISOString())
    return { key, date, ...(days.get(key) ?? { minutes: 0, tasks: 0, sessions: 0 }) }
  })
  const max = Math.max(1, ...chartDays.map((d) => d.minutes))
  const activeDays = chartDays.filter((d) => d.minutes > 0 && d.tasks === 0)
  const avgTasks = chartDays.reduce((n, d) => n + d.tasks, 0) / chartDays.length
  const checkIn = activeDays.length >= 2 && chartDays.some((d) => d.tasks >= avgTasks * 2 && d.tasks > 0)
  return <div className="flex flex-1 flex-col gap-2">
    <p className="text-xs text-muted">Estimated focus · minutes</p>
    <div className="grid min-h-40 flex-1 grid-cols-7 items-end gap-2" aria-label="Daily study minutes over the last 7 days">
      {chartDays.map((d) => <div key={d.key} className="flex h-full min-h-0 flex-col items-center justify-end gap-1" title={`${d.date.toLocaleDateString()}: ${Math.round(d.minutes)} focus minutes, ${d.tasks} completed tasks`}>
        <div className="relative flex min-h-28 w-full flex-1 items-end justify-center border-b border-line pt-5">
          <span className="relative w-3/4 max-w-12 rounded-t bg-accent" style={{ height: `${d.minutes / max * 100}%` }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-ink">{Math.round(d.minutes)}</span>
          </span>
        </div><span className="text-xs text-muted">{d.date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      </div>)}
    </div>
    <div className="border-t border-line pt-2">
      <p className="mb-1 text-xs text-muted">Tasks completed</p>
      <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-interaction">
        {chartDays.map((d) => <span key={d.key} aria-label={`${d.date.toLocaleDateString(undefined, { weekday: 'long' })}: ${d.tasks} completed tasks`}>{d.tasks}</span>)}
      </div>
    </div>
    {checkIn && <p className="mt-3 rounded-(--radius-ctl) bg-sunken p-3 text-sm">Some days took more time and others brought more small wins. If that feels surprising, take a moment to reflect on what helped.</p>}
    {!chartDays.some((d) => d.minutes || d.tasks) && <p className="mt-3 text-sm text-muted">Complete a study session or log a small win to start your daily picture.</p>}
  </div>
}
