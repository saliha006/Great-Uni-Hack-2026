// In-browser stand-in for the FastAPI backend (PRD §11). Same shapes, state in localStorage.
// Every threshold here is a mock heuristic (TUNE), not Yehor's engine and not research-derived.
import { BANKS, bankFromMaterial, type Bank, type BankItem } from './content'
import type {
  AdvanceDaysResult, AnswerBody, AnswerResult, EventsResult, FeynmanResult, FeynmanTurn, Insights, Item,
  Method, MethodStatView, NextItem, Plan, ProbeBody, Readiness, Reflection, Session, SessionEvent,
  SessionResult, SignedUrl, Subject, SubjectKind, SubjectState, SubjectSummary,
} from './types'
import { METHOD_LABEL } from './types'

const KEY = 'attune:mock:v1'
const LIVE: Method[] = ['ACTIVE_RECALL', 'PRACTICE_TEST', 'FEYNMAN']
const PRIOR: Record<string, [number, number]> = {
  ACTIVE_RECALL: [2.4, 1.6], PRACTICE_TEST: [2.4, 1.6], FEYNMAN: [2.1, 1.9],
}
const DAY = 86_400_000

interface HistoryRow {
  session_id: number; ts: string; method: Method; probe_score: number; active_minutes: number
  drift_share: number; lapse_share: number; felt: number; seeded: boolean
}
interface SubjectRec {
  subject: Subject; bank: Bank; stats: Record<string, { alpha: number; beta: number; n: number }>
  sampler: Record<string, { done: boolean; probe_score?: number }>; plan: Plan
  history: HistoryRow[]; reflections: Reflection[]; timeline: Insights['timeline']; material_words: number
}
interface ItemRec { item: Item; bank: BankItem; session_id: number }
interface SessionRec {
  session: Session; queue: number[]; served: number; difficultyCap: number
  latencies: { item_id: number; ratio: number; ts: number }[]; events: SessionEvent[]
  scores: number[]; lastIntervention: number; drifts: number; breaks: number; started: number
  probeIds: number[]; feynman?: FeynmanResult
}
interface DB {
  nextId: number; offsetDays: number; subjects: SubjectRec[]
  sessions: Record<number, SessionRec>; items: Record<number, ItemRec>
}

const empty = (): DB => ({ nextId: 1, offsetDays: 0, subjects: [], sessions: {}, items: {} })
let db: DB = load()

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DB) : empty()
  } catch {
    return empty()
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* storage full or blocked: keep in memory */ }
}
const id = () => db.nextId++
const now = () => Date.now() + db.offsetDays * DAY
const iso = (t = now()) => new Date(t).toISOString()
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function err(status: number, message: string): never {
  throw Object.assign(new Error(message), { status })
}
function subj(subjectId: number): SubjectRec {
  return db.subjects.find((s) => s.subject.id === subjectId) ?? err(404, 'Subject not found')
}
function sess(sessionId: number): SessionRec {
  return db.sessions[sessionId] ?? err(404, 'Session not found')
}

function statView(rec: SubjectRec): MethodStatView[] {
  return LIVE.map((m) => {
    const s = rec.stats[m]
    const mu = s.alpha / (s.alpha + s.beta)
    const sd = Math.sqrt((s.alpha * s.beta) / ((s.alpha + s.beta) ** 2 * (s.alpha + s.beta + 1)))
    return { method: m, n: s.n, mean_reward: +mu.toFixed(3), ci_low: +Math.max(0, mu - 1.96 * sd).toFixed(3), ci_high: +Math.min(1, mu + 1.96 * sd).toFixed(3) }
  })
}
function confidence(rec: SubjectRec): SubjectState['confidence'] {
  const n = Math.min(...LIVE.map((m) => rec.stats[m].n))
  return n >= 5 ? 'HIGH' : n >= 2 ? 'MODERATE' : 'EARLY'
}
function focusWindow(rec: SubjectRec): number {
  const recent = rec.history.slice(-5)
  if (!recent.length) return 20
  const drift = mean(recent.map((h) => h.drift_share + h.lapse_share))
  return Math.max(10, Math.min(45, Math.round(22 - drift * 20)))
}
function readiness(rec: SubjectRec): Readiness | null {
  if (!rec.history.length) return null
  const shrink = (xs: number[]) => (xs.length ? 0.5 + (mean(xs) - 0.5) * (xs.length / (xs.length + 3)) : null)
  const perf = rec.history.filter((h) => h.method === 'PRACTICE_TEST').map((h) => h.probe_score)
  const und = rec.history.filter((h) => h.method !== 'PRACTICE_TEST').map((h) => h.probe_score)
  const n = rec.history.length
  return { performance: shrink(perf), understanding: shrink(und), confidence: n >= 8 ? 'HIGH' : n >= 4 ? 'MEDIUM' : 'LOW' }
}
function choosePlan(rec: SubjectRec): Plan {
  const minutes = focusWindow(rec)
  if (rec.plan.mode === 'TRIAL' && rec.plan.trial_until && Date.parse(rec.plan.trial_until) > now()) {
    return { ...rec.plan, session_minutes: minutes }
  }
  if (rec.subject.phase === 'SAMPLING') {
    const done = LIVE.filter((m) => rec.sampler[m]?.done).length
    const offset = rec.subject.id % 3
    const order = [...LIVE.slice(offset), ...LIVE.slice(0, offset)]
    const next = order.find((m) => !rec.sampler[m]?.done) ?? order[0]
    return { method: next, mode: 'SAMPLER', session_minutes: 15, reason: `Calibration round ${done + 1} of 3: trying each method on a similar chunk.` }
  }
  const ranked = statView(rec).sort((a, b) => b.mean_reward - a.mean_reward)
  return { method: ranked[0].method, mode: 'ADAPTIVE', session_minutes: minutes, reason: `${METHOD_LABEL[ranked[0].method]} has given you the most learning per minute here so far.` }
}

function state(rec: SubjectRec): SubjectState {
  return clone({
    subject: rec.subject, sampler: rec.sampler, method_stats: statView(rec), plan: rec.plan,
    readiness: readiness(rec), focus_window_min: focusWindow(rec), confidence: confidence(rec),
  })
}

function newSubject(name: string, kind: SubjectKind, exam_date: string | null | undefined, bank: Bank): SubjectRec {
  const sid = id()
  const stats = Object.fromEntries(LIVE.map((m) => [m, { alpha: PRIOR[m][0], beta: PRIOR[m][1], n: 0 }]))
  const rec: SubjectRec = {
    subject: { id: sid, name, kind, exam_date: exam_date ?? null, phase: 'SAMPLING' },
    bank, stats, sampler: Object.fromEntries(LIVE.map((m) => [m, { done: false }])),
    plan: { method: 'ACTIVE_RECALL', mode: 'SAMPLER', session_minutes: 15, reason: '' },
    history: [], reflections: [], timeline: [], material_words: 0,
  }
  rec.plan = choosePlan(rec)
  db.subjects.push(rec)
  return rec
}

function makeItem(sessionId: number, b: BankItem, phase: Item['phase']): number {
  const iid = id()
  db.items[iid] = { item: { ...b.item, id: iid, phase }, bank: b, session_id: sessionId }
  return iid
}

function grade(b: BankItem, answer: string): number {
  const a = answer.trim().toLowerCase()
  if (!a) return 0
  if (b.item.kind === 'MCQ') return a === b.answer.toLowerCase() ? 1 : 0
  const hits = b.keywords.filter((k) => a.includes(k.toLowerCase())).length
  return b.keywords.length ? Math.min(1, hits / Math.min(2, b.keywords.length)) : 0.5
}

// ---------------------------------------------------------------- §11 endpoints
export const mock = {
  async createSubject(body: { name: string; kind: SubjectKind; exam_date?: string | null }): Promise<Subject> {
    await wait()
    const rec = newSubject(body.name.trim(), body.kind, body.exam_date, BANKS[body.name.trim()] ?? bankFromMaterial(body.name, body.kind, ''))
    save()
    return clone(rec.subject)
  },
  async listSubjects(): Promise<SubjectSummary[]> {
    await wait(80)
    return db.subjects.map((r) => clone({ subject: r.subject, plan: r.plan, readiness: readiness(r) }))
  },
  async addMaterial(subjectId: number, body: { title?: string; text?: string }): Promise<{ material_id: number; chunk_count: number }> {
    await wait(300)
    const rec = subj(subjectId)
    const text = body.text ?? ''
    const words = text.split(/\s+/).filter(Boolean).length
    if (words < 20) err(422, 'That material is too short to split into chunks. Paste at least a paragraph.')
    rec.material_words += words
    if (!BANKS[rec.subject.name]) rec.bank = bankFromMaterial(rec.subject.name, rec.subject.kind, text)
    save()
    return { material_id: id(), chunk_count: Math.max(1, Math.round(words / 300)) }
  },
  async subjectState(subjectId: number): Promise<SubjectState> {
    await wait(80)
    return state(subj(subjectId))
  },
  async createSession(body: { subject_id: number; method?: Method }): Promise<Session> {
    await wait()
    const rec = subj(body.subject_id)
    const plan = body.method ? { ...rec.plan, method: body.method } : rec.plan
    const sid = id()
    const pool = plan.method === 'PRACTICE_TEST' ? rec.bank.practice : rec.bank.recall
    const picked = plan.method === 'FEYNMAN'
      ? [{ item: { kind: 'FEYNMAN_BRIEF' as const, prompt: `Teach Sam about ${rec.bank.topic}. Explain it as if they have never heard of it.`, difficulty: 2 as const, expected_seconds: 180 }, answer: '', keywords: [] }]
      : [...pool].sort(() => Math.random() - 0.5).slice(0, 6)
    const session: Session = { id: sid, subject_id: rec.subject.id, method: plan.method, mode: plan.mode, planned_minutes: plan.session_minutes, chunk_id: 1, reason: plan.reason }
    db.sessions[sid] = {
      session, queue: picked.map((b) => makeItem(sid, b, 'MAIN')), served: 0, difficultyCap: 5,
      latencies: [], events: [], scores: [], lastIntervention: 0, drifts: 0, breaks: 0, started: Date.now(), probeIds: [],
    }
    save()
    return clone(session)
  },
  async nextItem(sessionId: number): Promise<NextItem> {
    await wait(80)
    const s = sess(sessionId)
    if (s.served >= s.queue.length) return { done: true }
    // EASIER intervention: prefer the easiest remaining item under the cap.
    const remaining = s.queue.slice(s.served)
    const pick = remaining.find((iid) => db.items[iid].item.difficulty <= s.difficultyCap) ?? remaining[0]
    s.queue = [...s.queue.slice(0, s.served), pick, ...remaining.filter((x) => x !== pick)]
    s.served++
    save()
    return clone(db.items[pick].item)
  },
  async answer(sessionId: number, body: AnswerBody): Promise<AnswerResult> {
    await wait(150)
    const s = sess(sessionId)
    const rec = db.items[body.item_id] ?? err(404, 'Item not found')
    if (rec.item.kind === 'RECALL_PROMPT') {
      if (body.self_grade == null) return { score: 0, correct: null, reveal: rec.bank.answer, feedback: 'Compare with the model answer, then rate yourself.' }
      s.scores.push(body.self_grade)
      save()
      return { score: body.self_grade, correct: null, feedback: body.self_grade === 1 ? 'Logged as got it.' : body.self_grade === 0.5 ? 'Logged as partly.' : 'Logged as missed. It will come back later.' }
    }
    const score = grade(rec.bank, body.answer)
    s.scores.push(score)
    save()
    return rec.item.kind === 'MCQ'
      ? { score, correct: score === 1, feedback: score === 1 ? 'Correct.' : `Not quite. The answer is "${rec.bank.answer}".` }
      : { score, correct: null, feedback: score >= 0.5 ? 'That covers the key idea.' : 'Some key ideas are missing.', reveal: rec.bank.answer }
  },
  async events(sessionId: number, body: { events: SessionEvent[] }): Promise<EventsResult> {
    await wait(60)
    const s = sess(sessionId)
    s.events.push(...body.events)
    for (const e of body.events) {
      if (e.type === 'ITEM_ANSWERED' && e.item_id && e.latency_ms && db.items[e.item_id]) {
        s.latencies.push({ item_id: e.item_id, ratio: e.latency_ms / 1000 / db.items[e.item_id].item.expected_seconds, ts: Date.now() })
      }
      if (e.type === 'BREAK_END') s.lastIntervention = Date.now()
    }
    const since = s.lastIntervention
    const win = s.latencies.slice(-8)
    const ratios = win.map((l) => l.ratio)
    const m = mean(ratios)
    const sd = Math.sqrt(mean(ratios.map((r) => (r - m) ** 2)))
    const cv = ratios.length >= 3 && m > 0 ? sd / m : null
    const recent = s.events.filter((e) => Date.parse(e.ts) >= since)
    const blur = recent.filter((e) => e.type === 'TAB_BLUR').length
    const idle = recent.filter((e) => e.type === 'IDLE').length
    const lastRatio = ratios.length ? ratios[ratios.length - 1] : null
    const stateName: EventsResult['attention']['state'] =
      idle >= 2 || (lastRatio ?? 0) >= 4 ? 'LAPSED'
        : idle === 1 || blur >= 2 || (lastRatio ?? 0) >= 2 || (cv ?? 0) >= 0.7 ? 'DRIFTING' : 'FOCUSED'
    const attention = { state: stateName, latency_cv: cv, latency_ratio: lastRatio, idle_count: idle, blur_count: blur, window_n: win.length }
    const cooled = Date.now() - s.lastIntervention > 45_000 // mock cooldown (TUNE); PRD §8.3 says 4 min
    const elapsedMin = (Date.now() - s.started) / 60_000
    let intervention: EventsResult['intervention'] = { type: 'NONE', message: '' }
    if (cooled && stateName !== 'FOCUSED') {
      if (elapsedMin >= s.session.planned_minutes) {
        intervention = { type: 'WRAP_UP', message: "Let's finish with the quick check." }
      } else if (stateName === 'LAPSED' || s.drifts >= 1) {
        s.breaks++
        intervention = { type: 'BREAK', message: 'Your pace is getting uneven. Take a few minutes?', break_seconds: s.breaks > 1 ? 300 : 180 }
      } else {
        s.difficultyCap = 2
        intervention = { type: 'EASIER', message: "Let's make this a bit easier.", new_difficulty: 2 }
      }
      s.drifts++
      s.lastIntervention = Date.now()
    }
    save()
    return { attention, intervention }
  },
  async signedUrl(sessionId: number): Promise<SignedUrl> {
    await wait()
    const s = sess(sessionId)
    const bank = subj(s.session.subject_id).bank
    return { signed_url: '', context: { topic: bank.topic, key_points: bank.key_points, first_message: `Hi! I've never learned this. Can you teach me about ${bank.topic}?` } }
  },
  async feynmanTranscript(sessionId: number, body: { turns: FeynmanTurn[] }): Promise<FeynmanResult> {
    await wait(500)
    const s = sess(sessionId)
    const bank = subj(s.session.subject_id).bank
    const said = body.turns.filter((t) => t.role === 'user').map((t) => t.text.toLowerCase()).join(' ')
    const hit = (kp: string) => kp.toLowerCase().match(/[a-z]{5,}/g)?.filter((w) => said.includes(w)).length ?? 0
    const covered = bank.key_points.filter((kp) => hit(kp) >= 2)
    const gaps = bank.key_points.filter((kp) => !covered.includes(kp))
    const score = +(covered.length / bank.key_points.length).toFixed(2)
    s.feynman = {
      score, covered, gaps,
      feedback: gaps.length ? `Clear on ${covered.length} of ${bank.key_points.length} ideas. Next time, cover: ${gaps[0].toLowerCase()}.` : 'You covered every key idea.',
    }
    s.scores.push(score)
    save()
    return clone(s.feynman)
  },
  async finish(sessionId: number): Promise<{ probe_items: Item[] }> {
    await wait()
    const s = sess(sessionId)
    const bank = subj(s.session.subject_id).bank
    s.probeIds = bank.probe.map((b) => makeItem(sessionId, b, 'PROBE'))
    save()
    return { probe_items: s.probeIds.map((i) => clone(db.items[i].item)) }
  },
  async probe(sessionId: number, body: ProbeBody): Promise<SessionResult> {
    await wait(400)
    const s = sess(sessionId)
    const rec = subj(s.session.subject_id)
    const probe = mean(body.answers.map((a) => grade(db.items[a.item_id]?.bank ?? { item: { kind: 'SHORT_ANSWER', prompt: '', difficulty: 1, expected_seconds: 1 }, answer: '', keywords: [] }, a.answer)))
    const active = Math.max(1, (Date.now() - s.started) / 60_000)
    const efficiency = probe / active
    const reward = 0.6 * probe + 0.25 * Math.min(1, efficiency * 4) + 0.15 * ((body.felt_rating - 1) / 4)
    const st = rec.stats[s.session.method]
    if (st) { st.alpha += reward; st.beta += 1 - reward; st.n++ }
    const notFocused = s.latencies.filter((l) => l.ratio >= 2).length / Math.max(1, s.latencies.length)
    rec.history.push({ session_id: sessionId, ts: iso(), method: s.session.method, probe_score: probe, active_minutes: active, drift_share: notFocused, lapse_share: 0, felt: body.felt_rating, seeded: false })
    if (s.breaks) rec.timeline.push({ ts: iso(), kind: 'BREAK', label: `Break during ${METHOD_LABEL[s.session.method]}` })
    if (rec.subject.phase === 'SAMPLING') {
      rec.sampler[s.session.method] = { done: true, probe_score: +probe.toFixed(2) }
      if (LIVE.every((m) => rec.sampler[m].done)) {
        rec.subject.phase = 'ADAPTIVE'
        rec.timeline.push({ ts: iso(), kind: 'SAMPLER_DONE', label: 'Calibration finished' })
      }
    }
    rec.plan = choosePlan(rec)
    save()
    return { probe_score: +probe.toFixed(2), active_minutes: +active.toFixed(1), efficiency: +efficiency.toFixed(3), reward: +reward.toFixed(2), subject_state: state(rec), reflection: null }
  },
  async insights(subjectId: number): Promise<Insights> {
    await wait(80)
    const rec = subj(subjectId)
    const series: Insights['method_series'] = {}
    for (const h of rec.history) (series[h.method] ??= []).push({ ts: h.ts, probe_score: +h.probe_score.toFixed(2) })
    return clone({
      method_series: series,
      attention_by_session: rec.history.map((h) => ({ session_id: h.session_id, ts: h.ts, method: h.method, drift_share: +h.drift_share.toFixed(2), lapse_share: h.lapse_share })),
      timeline: rec.timeline,
      readiness_series: rec.history.map((h, i) => {
        const r = readiness({ ...rec, history: rec.history.slice(0, i + 1) })
        return { ts: h.ts, performance: r?.performance ?? null, understanding: r?.understanding ?? null }
      }),
    })
  },
  async reflections(subjectId: number): Promise<Reflection[]> {
    await wait(80)
    return clone(subj(subjectId).reflections).reverse()
  },
  async reflect(body: { subject_id: number; trigger: 'MANUAL' | 'WEEKLY' }): Promise<Reflection> {
    await wait(600)
    return clone(reflectOn(subj(body.subject_id), body.trigger))
  },
  async devSeed(): Promise<{ subject_ids: number[] }> {
    await wait(300)
    db = empty()
    const ds = newSubject('Data Structures', 'PERFORMANCE', iso(now() + 38 * DAY).slice(0, 10), BANKS['Data Structures'])
    const bio = newSubject('Cell Biology', 'KNOWLEDGE', iso(now() + 33 * DAY).slice(0, 10), BANKS['Cell Biology'])
    // Seeded persona: 3 weeks on Data Structures, scores flatten in week 3 while focus stays good.
    const start = now() - 20 * DAY
    const scores = [0.3, 0.55, 0.52, 0.6, 0.63, 0.66, 0.65, 0.68, 0.7, 0.69, 0.7, 0.69, 0.7, 0.7]
    const methods: Method[] = ['ACTIVE_RECALL', 'PRACTICE_TEST', 'FEYNMAN']
    scores.forEach((p, i) => {
      const method = i < 3 ? methods[i] : i % 4 === 0 ? 'FEYNMAN' : 'PRACTICE_TEST' // Feynman ends up runner-up, so the plateau trial matches PRD §18
      const r = 0.6 * p + 0.25 * 0.55 + 0.15 * 0.6
      ds.stats[method].alpha += r; ds.stats[method].beta += 1 - r; ds.stats[method].n++
      ds.history.push({ session_id: id(), ts: iso(start + i * 1.4 * DAY + 3_600_000 * (10 + (i % 6))), method, probe_score: p, active_minutes: 16 + (i % 4), drift_share: 0.12 + (i % 3) * 0.04, lapse_share: 0.02, felt: 3 + (i % 2), seeded: true })
    })
    methods.forEach((m, i) => { ds.sampler[m] = { done: true, probe_score: scores[i] } })
    ds.subject.phase = 'ADAPTIVE'
    ds.timeline.push({ ts: ds.history[2].ts, kind: 'SAMPLER_DONE', label: 'Calibration finished (seeded)' })
    ds.plan = choosePlan(ds)
    // Cell Biology: one calibration round done today, two to go.
    bio.history.push({ session_id: id(), ts: iso(now() - 2 * DAY), method: 'ACTIVE_RECALL', probe_score: 0.6, active_minutes: 14, drift_share: 0.1, lapse_share: 0, felt: 4, seeded: true })
    bio.stats.ACTIVE_RECALL.n = 1
    bio.sampler.ACTIVE_RECALL = { done: true, probe_score: 0.6 }
    bio.plan = choosePlan(bio)
    save()
    return { subject_ids: [ds.subject.id, bio.subject.id] }
  },
  async devAdvanceDays(body: { days: number }): Promise<AdvanceDaysResult> {
    await wait(300)
    db.offsetDays += body.days
    const reflections = body.days >= 7 ? db.subjects.filter((r) => r.history.length >= 3).map((r) => reflectOn(r, 'WEEKLY')) : []
    save()
    return { advanced_to: iso(), reflections: clone(reflections) }
  },
  async devReset(): Promise<{ ok: boolean }> {
    await wait()
    db = empty()
    save()
    return { ok: true }
  },
  async devUsage(): Promise<Record<string, number>> {
    return { calls: 0, live_calls: 0, cache_hits: 0, prompt_tokens: 0, completion_tokens: 0 }
  },
}

function reflectOn(rec: SubjectRec, trigger: Reflection['trigger']): Reflection {
  const last = rec.history.slice(-6)
  const scores = last.map((h) => h.probe_score)
  const slope = scores.length >= 2 ? (scores[scores.length - 1] - scores[0]) / (scores.length - 1) : 0
  const avg = mean(scores)
  const attention = mean(last.map((h) => h.drift_share + h.lapse_share))
  const days = last.length >= 2 ? (Date.parse(last[last.length - 1].ts) - Date.parse(last[0].ts)) / DAY : 0
  let r: Omit<Reflection, 'id' | 'ts' | 'trigger'>
  if (last.length < 3) {
    r = { diagnosis: 'ON_TRACK', evidence: { sessions: last.length, insufficient_data: true }, decision: { action: 'KEEP' }, explanation: 'Not enough sessions yet to judge a trend, so the plan stays as it is.' }
  } else if (Math.abs(slope) < 0.02 && avg >= 0.85) {
    r = { diagnosis: 'MASTERED', evidence: { mean_probe: +avg.toFixed(2) }, decision: { action: 'RAISE_DIFFICULTY' }, explanation: 'Scores are high and steady. Time for harder material.' }
  } else if (attention >= 0.35) {
    r = { diagnosis: 'FATIGUE', evidence: { attention_off_share: +attention.toFixed(2) }, decision: { action: 'SHORTEN_SESSIONS', session_minutes: 10 }, explanation: 'Your focus has been dipping more often, so sessions get shorter for a while. The method stays the same.' }
  } else if (Math.abs(slope) < 0.02) {
    const ranked = statView(rec).sort((a, b) => b.mean_reward - a.mean_reward)
    const alt = ranked.find((m) => m.method !== rec.plan.method)?.method ?? 'FEYNMAN'
    rec.plan = { method: alt, mode: 'TRIAL', session_minutes: focusWindow(rec), trial_until: iso(now() + 7 * DAY), reason: `7-day trial of ${METHOD_LABEL[alt]} to test whether it breaks the plateau.` }
    rec.timeline.push({ ts: iso(), kind: 'TRIAL_START', label: `Trial: ${METHOD_LABEL[alt]} for 7 days` })
    r = {
      diagnosis: 'PLATEAU', evidence: { sessions: last.length, days: +days.toFixed(1), slope: +slope.toFixed(3), mean_probe: +avg.toFixed(2), attention_off_share: +attention.toFixed(2) },
      decision: { action: 'TRIAL_METHOD', method: alt, trial_days: 7 },
      explanation: `Your scores flattened over the last ${Math.round(days)} days while you stayed focused, so this isn't tiredness. Let's try ${METHOD_LABEL[alt]} for a week and compare.`,
    }
  } else {
    r = { diagnosis: 'ON_TRACK', evidence: { slope: +slope.toFixed(3) }, decision: { action: 'KEEP' }, explanation: 'Scores are still rising on this method, so the plan stays.' }
  }
  const full: Reflection = { id: id(), ts: iso(), trigger, ...r }
  rec.reflections.push(full)
  rec.timeline.push({ ts: full.ts, kind: 'RECALIBRATION', label: `Reflection: ${r.diagnosis.replace('_', ' ').toLowerCase()}` })
  save()
  return full
}

export const mockClock = () => iso()
export const mockHasSeeded = () => db.subjects.some((s) => s.history.some((h) => h.seeded))
