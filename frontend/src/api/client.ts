// One typed client for PRD §11. VITE_API_URL set → real FastAPI; empty → in-browser mock.
import { mock, mockClock, mockHasSeeded } from './mock'
import { getLocal } from '../lib/local'
import type {
  AdvanceDaysResult, AnswerBody, AnswerResult, AskResult, Persona, StudyKind, StudySet, EventsResult, FeynmanResult, FeynmanTurn, Insights, Item,
  Method, NextItem, ProbeBody, Reflection, Session, SessionEvent, SessionResult, SignedUrl, Subject,
  SubjectKind, SubjectState, SubjectSummary,
} from './types'

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
// "/" means the API is on this same origin (Vercel routes /api to the backend), so it still counts as real.
export const usingMock = RAW_BASE.trim() === ''
const BASE = RAW_BASE.replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function http<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: init?.method ?? 'GET',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch {
    throw new ApiError(`Can't reach the server at ${BASE}. Is the backend running?`, 0)
  }
  if (!res.ok) {
    const detail = await res.json().then((j: { detail?: unknown }) => j.detail).catch(() => undefined)
    throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${res.status})`, res.status)
  }
  return (await res.json()) as T
}

async function viaMock<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    const err = e as Error & { status?: number }
    throw new ApiError(err.message, err.status ?? 500)
  }
}

const post = <T,>(path: string, body: unknown = {}) => http<T>(path, { method: 'POST', body })

export const api = {
  createSubject: (b: { name: string; kind: SubjectKind; exam_date?: string | null }) =>
    usingMock ? viaMock(() => mock.createSubject(b)) : post<Subject>('/subjects', b),
  listSubjects: () => (usingMock ? viaMock(mock.listSubjects) : http<SubjectSummary[]>('/subjects')),
  addMaterial: (id: number, b: { title?: string; text?: string; pdf_base64?: string }) =>
    usingMock ? viaMock(() => mock.addMaterial(id, b)) : post<{ material_id: number; chunk_count: number }>(`/subjects/${id}/material`, b),
  subjectState: (id: number) => (usingMock ? viaMock(() => mock.subjectState(id)) : http<SubjectState>(`/subjects/${id}/state`)),
  createSession: (b: { subject_id: number; method?: Method }) =>
    usingMock ? viaMock(() => mock.createSession(b)) : post<Session>('/sessions', b),
  nextItem: (sid: number) => (usingMock ? viaMock(() => mock.nextItem(sid)) : http<NextItem>(`/sessions/${sid}/next-item`)),
  answer: (sid: number, b: AnswerBody) => (usingMock ? viaMock(() => mock.answer(sid, b)) : post<AnswerResult>(`/sessions/${sid}/answer`, b)),
  events: (sid: number, events: SessionEvent[]) =>
    usingMock ? viaMock(() => mock.events(sid, { events })) : post<EventsResult>(`/sessions/${sid}/events`, { events }),
  signedUrl: (sid: number) => (usingMock ? viaMock(() => mock.signedUrl(sid)) : http<SignedUrl>(`/voice/signed-url?session_id=${sid}`)),
  feynmanTranscript: (sid: number, turns: FeynmanTurn[]) =>
    usingMock ? viaMock(() => mock.feynmanTranscript(sid, { turns })) : post<FeynmanResult>(`/sessions/${sid}/feynman-transcript`, { turns }),
  finish: (sid: number) => (usingMock ? viaMock(() => mock.finish(sid)) : post<{ probe_items: Item[] }>(`/sessions/${sid}/finish`)),
  probe: (sid: number, b: ProbeBody) => (usingMock ? viaMock(() => mock.probe(sid, b)) : post<SessionResult>(`/sessions/${sid}/probe`, b)),
  insights: (id: number) => (usingMock ? viaMock(() => mock.insights(id)) : http<Insights>(`/subjects/${id}/insights`)),
  reflections: (id: number) => (usingMock ? viaMock(() => mock.reflections(id)) : http<Reflection[]>(`/subjects/${id}/reflections`)),
  reflect: (b: { subject_id: number; trigger: 'MANUAL' | 'WEEKLY' }) =>
    usingMock ? viaMock(() => mock.reflect(b)) : post<Reflection>('/agent/reflect', b),
  devSeed: (persona?: string) =>
    usingMock ? viaMock<SeedResult>(mock.devSeed) : post<SeedResult>('/dev/seed', persona ? { persona } : {}),
  devPersonas: () => (usingMock ? Promise.resolve(MOCK_PERSONAS) : http<Persona[]>('/dev/personas')),
  // Tutor and study tools ground every line in the notes server-side, so the in-browser mock can't fake them.
  ask: (subjectId: number, question: string, sessionId?: number) =>
    usingMock ? Promise.resolve(MOCK_ASK) : post<AskResult>(`/subjects/${subjectId}/ask`, { question, session_id: sessionId ?? null }),
  quizAnswer: (subjectId: number, b: { qid: string; answer: string; latency_ms: number; previous: string[] }) =>
    usingMock ? Promise.reject(new ApiError(NEEDS_BACKEND, 503)) : post<AnswerResult>(`/subjects/${subjectId}/quiz-answer`, b),
  studySet: (subjectId: number, kind: StudyKind) =>
    usingMock ? Promise.reject(new ApiError(NEEDS_BACKEND, 503)) : post<StudySet>(`/subjects/${subjectId}/study-set`, { kind }),
  devAdvanceDays: (days: number) =>
    usingMock ? viaMock(() => mock.devAdvanceDays({ days })) : post<AdvanceDaysResult>('/dev/advance-days', { days }),
  devReset: () => (usingMock ? viaMock(mock.devReset) : post<{ ok: boolean }>('/dev/reset')),
  devUsage: () => (usingMock ? viaMock(mock.devUsage) : http<Record<string, number>>('/dev/usage')),
}

type SeedResult = { subject_ids: number[]; name?: string; label?: string }
const NEEDS_BACKEND = 'This needs the live backend (it quotes your own notes). Run the backend to try it.'
const MOCK_ASK: AskResult = { intent: 'NOT_IN_NOTES', message: NEEDS_BACKEND, answer: [] }
const MOCK_PERSONAS: Persona[] = [{ key: 'ada', name: 'Ada', label: 'The full story', blurb: 'The demo student.' }]

// Dev clock: the backend shifts "now" with advance-days; the mock does the same locally.
export const clockNow = () => (usingMock ? mockClock() : new Date().toISOString())
// The backend has no "is anything seeded?" endpoint, so for it we remember that /dev/seed ran here.
export const hasSeededData = () => (usingMock ? mockHasSeeded() : getLocal().seededFlag)
