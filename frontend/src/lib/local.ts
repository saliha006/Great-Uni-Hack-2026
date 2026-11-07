// Frontend-only state (not in PRD §11): frog choice, open questions, activity log, settings,
// resume point. Lives in this browser's localStorage and the UI says so.
import { useRef, useSyncExternalStore } from 'react'
import type { Item, Session } from '../api/types'

export type TimerMode = 'ADAPTIVE' | 'POMODORO' | 'UNTIMED'

export interface Question {
  id: string
  text: string
  subjectId?: number
  subjectName?: string
  createdAt: string
  resolved: boolean
  answer?: string
}

export interface ActivityEntry {
  date: string // YYYY-MM-DD, local
  kind: 'SESSION' | 'FROG' | 'QUESTION_RESOLVED'
  label: string
}

// §11 has no GET /sessions/{id}, so the session object itself is kept here for reload/resume.
export interface Resume {
  session: Session
  subjectName: string
  itemsDone: number
  savedAt: string
  currentItem?: Item // so a reload shows the same question instead of skipping it
  elapsedSec?: number // so the timer continues after a reload
}

export interface LocalState {
  frogSubjectId: number | null
  frogDate: string | null // frog choice is per day
  frogSkipped: string | null // "not today" date
  questions: Question[]
  activity: ActivityEntry[]
  timerMode: TimerMode
  pomodoroWork: number
  pomodoroBreak: number
  cursorDot: boolean
  dnd: { phone: boolean; laptop: boolean } // simulated only
  resume: Resume | null
  seededFlag: boolean
  theme: 'system' | 'light' | 'dark'
  showAttention: boolean
  simulateDrift: boolean // dev panel: inflate reported latency so the demo can trigger drift
}

const KEY = 'attune:local:v1'
const initial: LocalState = {
  frogSubjectId: null,
  frogDate: null,
  frogSkipped: null,
  questions: [],
  activity: [],
  timerMode: 'ADAPTIVE',
  pomodoroWork: 25,
  pomodoroBreak: 5,
  cursorDot: true,
  dnd: { phone: true, laptop: true },
  resume: null,
  seededFlag: false,
  theme: 'system',
  showAttention: true,
  simulateDrift: false,
}

let state: LocalState = read()
const listeners = new Set<() => void>()

function read(): LocalState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...initial, ...(JSON.parse(raw) as Partial<LocalState>) } : initial
  } catch {
    return initial
  }
}

export let lastSaveOk = true
export function setLocal(patch: Partial<LocalState> | ((s: LocalState) => Partial<LocalState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    lastSaveOk = true
  } catch {
    lastSaveOk = false // shown in the status strip as "Not saved"
  }
  listeners.forEach((l) => l())
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  const ka = Object.keys(a), kb = Object.keys(b)
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

// Selectors may build a fresh object each call; keep the previous one if it's shallow-equal,
// otherwise useSyncExternalStore sees a "changed" snapshot every render and loops.
export function useLocal<T>(select: (s: LocalState) => T): T {
  const cache = useRef<{ value: T } | null>(null)
  return useSyncExternalStore(subscribe, () => {
    const next = select(state)
    if (cache.current && shallowEqual(cache.current.value, next)) return cache.current.value
    cache.current = { value: next }
    return next
  })
}
export const getLocal = () => state

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function logActivity(kind: ActivityEntry['kind'], label: string, date = todayKey()) {
  setLocal((s) => ({ activity: [...s.activity, { date, kind, label }] }))
}

export function addQuestion(text: string, subjectId?: number, subjectName?: string) {
  const q: Question = { id: crypto.randomUUID(), text, subjectId, subjectName, createdAt: new Date().toISOString(), resolved: false }
  setLocal((s) => ({ questions: [q, ...s.questions] }))
  return q
}
