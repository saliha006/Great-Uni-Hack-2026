// PRD §11 contract, copied field-for-field (frozen 14:45). When the backend is running,
// `npm run gen:api` writes src/api/schema.d.ts from /openapi.json; these names match it.

export type Method = 'ACTIVE_RECALL' | 'FEYNMAN' | 'PRACTICE_TEST' | 'SPACED_FLASHCARDS' | 'BLURTING'
export type SubjectKind = 'PERFORMANCE' | 'KNOWLEDGE'
export type Phase = 'SAMPLING' | 'ADAPTIVE'
export type SessionMode = 'SAMPLER' | 'ADAPTIVE' | 'TRIAL'
export type AttentionStateName = 'FOCUSED' | 'DRIFTING' | 'LAPSED'
export type InterventionType = 'NONE' | 'EASIER' | 'SWITCH_FORMAT' | 'BREAK' | 'WRAP_UP'
export type DiagnosisName = 'ON_TRACK' | 'MASTERED' | 'LOW_ENGAGEMENT' | 'FATIGUE' | 'PLATEAU'
export type Confidence = 'EARLY' | 'MODERATE' | 'HIGH'

export interface Subject { id: number; name: string; kind: SubjectKind; exam_date?: string | null; phase: Phase }
export interface Plan { method: Method; mode: SessionMode; session_minutes: number; trial_until?: string | null; reason: string }
export interface MethodStatView { method: Method; n: number; mean_reward: number; ci_low: number; ci_high: number }
export interface Readiness { performance: number | null; understanding: number | null; confidence: 'LOW' | 'MEDIUM' | 'HIGH' }
export interface SubjectState {
  subject: Subject
  sampler: Record<string, { done: boolean; probe_score?: number | null }>
  method_stats: MethodStatView[]
  plan: Plan
  readiness: Readiness | null
  focus_window_min: number
  confidence: Confidence
}
export interface SubjectSummary { subject: Subject; plan: Plan; readiness: Readiness | null }
export interface Session { id: number; subject_id: number; method: Method; mode: SessionMode; planned_minutes: number; chunk_id: number; reason: string }
export interface Item {
  id: number
  kind: 'RECALL_PROMPT' | 'MCQ' | 'SHORT_ANSWER' | 'PROBLEM' | 'FEYNMAN_BRIEF'
  phase: 'MAIN' | 'PROBE' | 'WARMUP_PROBE'
  prompt: string
  options?: string[] | null
  difficulty: 1 | 2 | 3 | 4 | 5
  expected_seconds: number
  hint?: string | null
}
export interface Done { done: true }
export type NextItem = Item | Done
export interface AnswerBody { item_id: number; answer: string; latency_ms: number; self_grade?: 0 | 0.5 | 1 | null }
export interface AnswerResult { score: number; correct?: boolean | null; feedback?: string | null; reveal?: string | null }
export type EventType = 'ITEM_SHOWN' | 'ITEM_ANSWERED' | 'TAB_BLUR' | 'TAB_FOCUS' | 'IDLE' | 'BREAK_START' | 'BREAK_END' | 'VOICE_TURN'
export interface SessionEvent { type: EventType; ts: string; item_id?: number | null; latency_ms?: number | null; payload?: Record<string, unknown> | null }
export interface AttentionReading { state: AttentionStateName; latency_cv: number | null; latency_ratio: number | null; idle_count: number; blur_count: number; window_n: number }
export interface Intervention { type: InterventionType; message: string; break_seconds?: number | null; new_difficulty?: number | null }
export interface EventsResult { attention: AttentionReading; intervention: Intervention }
export interface FeynmanTurn { role: 'user' | 'agent'; text: string; ts: string }
export interface FeynmanResult { score: number; covered: string[]; gaps: string[]; feedback: string }
export interface Decision { action: 'KEEP' | 'TRIAL_METHOD' | 'SHORTEN_SESSIONS' | 'EASE_IN' | 'RAISE_DIFFICULTY'; method?: Method | null; trial_days?: number | null; session_minutes?: number | null }
export interface Reflection { id: number; ts: string; trigger: 'WEEKLY' | 'PLATEAU' | 'MANUAL'; diagnosis: DiagnosisName; evidence: Record<string, unknown>; decision: Decision; explanation: string }
export interface SessionResult { probe_score: number; active_minutes: number; efficiency: number; reward: number; subject_state: SubjectState; reflection?: Reflection | null }
export interface ProbeBody { answers: { item_id: number; answer: string; latency_ms: number }[]; felt_rating: 1 | 2 | 3 | 4 | 5 }
export interface VoiceContext { topic: string; key_points: string[]; first_message: string }
export interface SignedUrl { signed_url: string; context: VoiceContext }
export interface Insights {
  method_series: Record<string, { ts: string; probe_score: number }[]>
  attention_by_session: { session_id: number; ts: string; method: Method; drift_share: number; lapse_share: number }[]
  timeline: { ts: string; kind: 'RECALIBRATION' | 'BREAK' | 'TRIAL_START' | 'TRIAL_END' | 'SAMPLER_DONE'; label: string }[]
  readiness_series: { ts: string; performance: number | null; understanding: number | null }[]
}
export interface AdvanceDaysResult { advanced_to: string; reflections: Reflection[] }

export const isDone = (x: NextItem): x is Done => 'done' in x && x.done === true

export const METHOD_LABEL: Record<Method, string> = {
  ACTIVE_RECALL: 'Active Recall',
  FEYNMAN: 'Feynman',
  PRACTICE_TEST: 'Practice Test',
  SPACED_FLASHCARDS: 'Spaced Flashcards',
  BLURTING: 'Blurting',
}
