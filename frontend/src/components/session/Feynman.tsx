// Feynman: teach "Sam", a curious student. Voice (ElevenLabs, backend-signed URL) or typed fallback.
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { EventType, FeynmanResult, FeynmanTurn, Item, SessionEvent, VoiceContext } from '../../api/types'
import { Button, Card, ErrorBox, Spinner } from '../ui'

type Emit = (type: EventType, extra?: Partial<SessionEvent>) => void

export function Feynman({ sessionId, item, emit, onDone }: { sessionId: number; item: Item; emit: Emit; onDone: (r: FeynmanResult) => void }) {
  const [ctx, setCtx] = useState<{ signed: string; context: VoiceContext } | null>(null)
  const [mode, setMode] = useState<'intro' | 'connecting' | 'voice' | 'typed'>('intro')
  const [voiceNote, setVoiceNote] = useState<string | null>(null)
  const [turns, setTurns] = useState<FeynmanTurn[]>([])
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [result, setResult] = useState<FeynmanResult | null>(null)

  // Backend contract (Saliha, 15:30): the signed URL is minted on the Start click; 502
  // voice_unavailable (or no URL, as in the mock) means typed Feynman with one explanation turn.
  const startVoice = async () => {
    setMode('connecting')
    try {
      const r = await api.signedUrl(sessionId)
      if (!r.signed_url) throw new ApiError('voice_unavailable', 502)
      setCtx({ signed: r.signed_url, context: r.context })
      setMode('voice')
    } catch (e) {
      setVoiceNote(e instanceof ApiError && e.status === 502 ? "Voice isn't available right now, so type your explanation instead." : "Couldn't connect to voice, so type your explanation instead.")
      setMode('typed')
    }
  }

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

      {mode === 'intro' && (
        <Card className="mt-5 max-w-2xl">
          <h3 className="text-lg font-bold">Talk or type?</h3>
          <p className="mt-2">
            Voice mode uses your microphone. Your browser will ask for permission, and audio goes to ElevenLabs only while you talk to Sam. Typing works the same way and is scored the same way.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="primary" onClick={startVoice}>Talk to Sam</Button>
            <Button onClick={() => setMode('typed')}>Type instead</Button>
          </div>
        </Card>
      )}

      {mode === 'connecting' && <Spinner label="Connecting to Sam" />}
      {mode === 'voice' && ctx && (
        <ConversationProvider>
          <VoiceChat signedUrl={ctx.signed} context={ctx.context} onTurn={addTurn} onFail={() => { setVoiceNote('Voice dropped, so type your explanation instead.'); setMode('typed') }} />
        </ConversationProvider>
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

function VoiceChat({ signedUrl, context, onTurn, onFail }: { signedUrl: string; context: VoiceContext; onTurn: (t: FeynmanTurn) => void; onFail: () => void }) {
  const [failed, setFailed] = useState<string | null>(null)
  const conv = useConversation({
    onMessage: (m) => onTurn({ role: m.role === 'user' ? 'user' : 'agent', text: m.message, ts: new Date().toISOString() }),
    onError: (msg) => setFailed(typeof msg === 'string' ? msg : 'Voice connection failed'),
  })

  const start = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      conv.startSession({ signedUrl, dynamicVariables: { topic: context.topic, key_points: context.key_points.join('; ') } })
    } catch {
      setFailed('Microphone access was blocked. You can type instead.')
    }
  }
  useEffect(() => () => conv.endSession(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const live = conv.status === 'connected'
  return (
    <Card className="mt-5 flex flex-wrap items-center gap-4">
      {!live ? (
        <Button variant="primary" onClick={start} disabled={conv.status === 'connecting'}>
          {conv.status === 'connecting' ? 'Connecting…' : 'Start talking'}
        </Button>
      ) : (
        <>
          <span className={`size-4 rounded-full ${conv.isSpeaking ? 'animate-pulse bg-accent' : 'bg-ok'}`} aria-hidden />
          <span className="font-semibold" role="status">{conv.isSpeaking ? 'Sam is talking' : 'Listening to you'}</span>
          <Button variant="ghost" onClick={() => conv.endSession()}>Hang up</Button>
        </>
      )}
      {failed && (
        <div className="w-full">
          <ErrorBox error={new Error(failed)} />
          <Button className="mt-2" onClick={onFail}>Type instead</Button>
        </div>
      )}
    </Card>
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
