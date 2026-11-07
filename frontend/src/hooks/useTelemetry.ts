// Telemetry contract (brief): latency_ms = item render → submit; ts = ISO UTC; item_id on item
// events; IDLE after 30 s with no input. Batched to POST /events every ~5 s and on each answer.
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { AttentionReading, EventType, Intervention, SessionEvent } from '../api/types'
import { getLocal } from '../lib/local'

const FLUSH_MS = 5_000
const IDLE_MS = 30_000

export function useTelemetry(sessionId: number, onIntervention: (i: Intervention) => void, paused: boolean) {
  const buffer = useRef<SessionEvent[]>([])
  const lastInput = useRef(Date.now())
  const idleSent = useRef(false)
  const shownAt = useRef<Map<number, number>>(new Map())
  const pausedRef = useRef(paused)
  const onIntRef = useRef(onIntervention)
  const [attention, setAttention] = useState<AttentionReading | null>(null)
  const [offTaskMs, setOffTaskMs] = useState(0)
  const stateSince = useRef<{ state: AttentionReading['state']; at: number }>({ state: 'FOCUSED', at: Date.now() })

  pausedRef.current = paused
  onIntRef.current = onIntervention

  const emit = useCallback((type: EventType, extra: Partial<SessionEvent> = {}) => {
    buffer.current.push({ type, ts: new Date().toISOString(), ...extra })
  }, [])

  const flush = useCallback(async () => {
    if (!buffer.current.length) return
    const batch = buffer.current
    buffer.current = []
    try {
      const res = await api.events(sessionId, batch)
      const prev = stateSince.current
      if (res.attention.state !== prev.state) {
        if (prev.state !== 'FOCUSED') setOffTaskMs((ms) => ms + (Date.now() - prev.at))
        stateSince.current = { state: res.attention.state, at: Date.now() }
      }
      setAttention(res.attention)
      if (res.intervention.type !== 'NONE' && !pausedRef.current) onIntRef.current(res.intervention)
    } catch {
      buffer.current = [...batch, ...buffer.current] // keep events for the next try
    }
  }, [sessionId])

  const itemShown = useCallback((itemId: number) => {
    shownAt.current.set(itemId, Date.now())
    emit('ITEM_SHOWN', { item_id: itemId })
  }, [emit])

  // Returns the latency to send with the answer, so /answer and /events agree.
  const itemAnswered = useCallback((itemId: number) => {
    const raw = Date.now() - (shownAt.current.get(itemId) ?? Date.now())
    const latency_ms = getLocal().simulateDrift ? Math.round(raw * 4 + 90_000) : raw
    emit('ITEM_ANSWERED', { item_id: itemId, latency_ms })
    void flush()
    return latency_ms
  }, [emit, flush])

  useEffect(() => {
    const onVis = () => emit(document.hidden ? 'TAB_BLUR' : 'TAB_FOCUS')
    const onInput = () => {
      lastInput.current = Date.now()
      idleSent.current = false
    }
    document.addEventListener('visibilitychange', onVis)
    for (const ev of ['keydown', 'pointerdown', 'pointermove', 'input', 'scroll'] as const) window.addEventListener(ev, onInput, { passive: true })
    const idleTimer = setInterval(() => {
      if (!pausedRef.current && !idleSent.current && Date.now() - lastInput.current > IDLE_MS) {
        idleSent.current = true
        emit('IDLE', { payload: { idle_ms: Date.now() - lastInput.current } })
      }
    }, 2_000)
    const flushTimer = setInterval(() => void flush(), FLUSH_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      for (const ev of ['keydown', 'pointerdown', 'pointermove', 'input', 'scroll'] as const) window.removeEventListener(ev, onInput)
      clearInterval(idleTimer)
      clearInterval(flushTimer)
      void flush()
    }
  }, [emit, flush])

  const offTaskTotal = () => offTaskMs + (stateSince.current.state !== 'FOCUSED' ? Date.now() - stateSince.current.at : 0)

  return { emit, flush, itemShown, itemAnswered, attention, offTaskTotal }
}
