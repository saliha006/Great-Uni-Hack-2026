// Feynman: teach "Sam", a curious student. Voice (ElevenLabs, backend-signed URL) or typed fallback.
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { EventType, FeynmanResult, FeynmanTurn, Item, SessionEvent, VoiceContext } from '../../api/types'
import { Button, Card, ErrorBox } from '../ui'
import { VoiceOrb, type OrbState } from '../VoiceOrb'

type Emit = (type: EventType, extra?: Partial<SessionEvent>) => void

export function Feynman({ sessionId, item, emit, onDone }: { sessionId: number; item: Item; emit: Emit; onDone: (r: FeynmanResult) => void }) {
  const [ctx, setCtx] = useState<{ signed: string; context: VoiceContext } | null>(null)
  const [mode, setMode] = useState<'voice' | 'typed'>('voice')
  const [voiceNote, setVoiceNote] = useState<string | null>(null)
  const [turns, setTurns] = useState<FeynmanTurn[]>([])
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<FeynmanResult | null>(null)

  // The signed URL is fetched as the screen opens (it stays valid for minutes), so one tap on the orb can start
  // the microphone and the conversation inside the same click. 502 voice_unavailable means typed Feynman.
  useEffect(() => {
    let live = true
    api.signedUrl(sessionId).then((r) => {
      if (!r.signed_url) throw new ApiError('voice_unavailable', 502)
      if (live) setCtx({ signed: r.signed_url, context: r.context })
    }).catch((e) => {
      if (!live) return
      setVoiceNote(e instanceof ApiError && e.status === 502 ? "Voice isn't available right now, so type your explanation instead." : "Couldn't connect to voice, so type your explanation instead.")
      setMode('typed')
    })
    return () => { live = false }
  }, [sessionId])

  const addTurn = (t: FeynmanTurn) => {
    setTurns((ts) => [...ts, t])
    emit('VOICE_TURN', { ts: t.ts, payload: { role: t.role, chars: t.text.length } })
  }

  const finish = async () => {
    setGrading(true)
    setError(null)
    try {
      const r = await api.feynmanTranscript(sessionId, turns)
      setResult(r)
    } catch (e) {
      setError(e)
    } finally {
      setGrading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-extrabold">Sam understood {Math.round(result.score * 100)}%</h2>
        <p className="text-lg">{result.feedback}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <h3 className="font-bold">You covered</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">{result.covered.length ? result.covered.map((c) => <li key={c}>{c}</li>) : <li className="text-muted">Nothing matched yet</li>}</ul>
          </Card>
          <Card>
            <h3 className="font-bold">Gaps to fill</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">{result.gaps.length ? result.gaps.map((g) => <li key={g}>{g}</li>) : <li className="text-muted">None, nice</li>}</ul>
          </Card>
        </div>
        <Button variant="primary" size="lg" onClick={() => onDone(result)}>Continue to the quick check</Button>
      </div>
    )
  }

  const userTurns = turns.filter((t) => t.role === 'user').length

  return (
    <div>
      <p className="text-sm text-muted">Feynman · teach it back</p>
      <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{item.prompt}</h2>

      {mode === 'voice' && (
        <>
          <p className="mt-3 max-w-2xl text-muted">
            Explain it out loud to Sam, a curious student who knows nothing about it. Sam asks questions but never explains,
            so you find your own gaps. Audio goes to ElevenLabs only while you talk.
          </p>
          <ConversationProvider>
            <VoiceChat ctx={ctx} onTurn={addTurn} onFail={() => { setVoiceNote('Voice dropped, so type your explanation instead.'); setMode('typed') }} />
          </ConversationProvider>
          <div className="mt-2 text-center"><Button variant="ghost" size="sm" onClick={() => setMode('typed')}>Type instead</Button></div>
        </>
      )}
      {mode === 'typed' && <TypedExplanation note={voiceNote} sent={turns.some((t) => t.role === 'user')} onTurn={addTurn} />}

      {(mode === 'voice' || mode === 'typed') && (
        <>
          <Transcript turns={turns} />
          {error !== null && <div className="mt-4"><ErrorBox error={error} onRetry={finish} /></div>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={finish} disabled={!userTurns || grading}>
              {grading ? 'Scoring your explanation…' : 'End and score'}
            </Button>
            {mode === 'voice' && <Button variant="ghost" onClick={() => setMode('typed')}>Switch to typing</Button>}
            {mode === 'voice' && <span className="text-sm text-muted">{userTurns} things said so far</span>}
          </div>
        </>
      )}
    </div>
  )
}

function VoiceChat({ ctx, onTurn, onFail }: { ctx: { signed: string; context: VoiceContext } | null; onTurn: (t: FeynmanTurn) => void; onFail: () => void }) {
  const [failed, setFailed] = useState<string | null>(null)
  const conv = useConversation({
    onMessage: (m) => onTurn({ role: m.role === 'user' ? 'user' : 'agent', text: m.message, ts: new Date().toISOString() }),
    onError: (msg) => setFailed(typeof msg === 'string' ? msg : 'Voice connection failed'),
  })

  const live = conv.status === 'connected'
  const toggle = async () => {
    if (live) {
      await conv.endSession()
      return
    }
    if (!ctx) return
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conv.startSession({ signedUrl: ctx.signed, dynamicVariables: { topic: ctx.context.topic, key_points: ctx.context.key_points.join('; ') } })
    } catch {
      setFailed('Microphone access was blocked. You can type instead.')
    }
  }
  useEffect(() => () => { void conv.endSession() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const state: OrbState = conv.status === 'connecting' || (!ctx && !failed) ? 'connecting'
    : live ? (conv.isSpeaking ? 'speaking' : 'listening') : 'idle'
  const level = () => (conv.isSpeaking ? conv.getOutputVolume() : conv.getInputVolume())

  return (
    <div className="mt-6">
      <VoiceOrb state={state} level={live ? level : undefined} onClick={() => void toggle()} disabled={!ctx} />
      {failed && (
        <Card className="mx-auto mt-4 max-w-lg">
          <ErrorBox error={new Error(failed)} />
          <Button className="mt-2" onClick={onFail}>Type instead</Button>
        </Card>
      )}
    </div>
  )
}

// One explanation turn, graded by the same transcript grader as voice (backend contract, 15:30).
function TypedExplanation({ note, sent, onTurn }: { note: string | null; sent: boolean; onTurn: (t: FeynmanTurn) => void }) {
  const [text, setText] = useState('')
  const send = () => {
    const t = text.trim()
    if (t) onTurn({ role: 'user', text: t, ts: new Date().toISOString() })
  }
  if (sent) return null
  return (
    <div className="mt-5">
      {note && <p role="status" className="mb-3 rounded-(--radius-ctl) bg-sunken p-3">{note}</p>}
      <label htmlFor="feyn" className="font-semibold">Explain it as if Sam has never heard of it</label>
      <textarea
        id="feyn"
        rows={8}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
        placeholder="Start with what it is, then why it happens, then an example…"
        className="mt-1 w-full rounded-(--radius-ctl) border border-line bg-surface p-3 text-lg leading-relaxed"
      />
      <Button className="mt-2" onClick={send} disabled={!text.trim()}>Hand in my explanation</Button>
    </div>
  )
}

function Transcript({ turns }: { turns: FeynmanTurn[] }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as cleanup.
    void end.current?.scrollIntoView({ block: 'nearest' })
  }, [turns.length])
  if (!turns.length) return null
  return (
    <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-(--radius-card) border border-line bg-surface p-4" aria-label="Transcript" aria-live="polite">
      {turns.map((t, i) => (
        <div key={i} className={t.role === 'user' ? 'ml-8 text-right' : 'mr-8'}>
          <span className="block text-xs font-semibold text-muted">{t.role === 'user' ? 'You' : 'Sam'}</span>
          <span className={`inline-block rounded-(--radius-ctl) px-3 py-2 ${t.role === 'user' ? 'bg-ink text-bg' : 'bg-sunken'}`}>{t.text}</span>
        </div>
      ))}
      <div ref={end} />
    </div>
  )
}
