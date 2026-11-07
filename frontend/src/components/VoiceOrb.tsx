// A moving gradient orb for voice: breathes when idle, swells with your voice, pulses with Sam's.
import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'connecting' | 'listening' | 'speaking'

const LABEL: Record<OrbState, string> = {
  idle: 'Tap to talk to Sam',
  connecting: 'Connecting…',
  listening: 'Listening… tap to hang up',
  speaking: 'Sam is talking… tap to hang up',
}

export function VoiceOrb({ state, level, onClick, disabled }: {
  state: OrbState
  // 0..1 loudness, read every frame (the SDK exposes input/output volume as plain getters).
  level?: () => number
  onClick: () => void
  disabled?: boolean
}) {
  const core = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let frame = 0
    let smooth = 0
    const tick = () => {
      const target = level && (state === 'listening' || state === 'speaking') ? Math.min(1, level() * 2.2) : 0
      smooth += (target - smooth) * 0.25
      core.current?.style.setProperty('--orb-level', smooth.toFixed(3))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [level, state])

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={LABEL[state]}
        className="group relative grid size-56 place-items-center rounded-full outline-offset-8 disabled:opacity-60 sm:size-64"
      >
        <span aria-hidden className={`orb-glow absolute inset-0 rounded-full ${state === 'speaking' ? 'orb-fast' : ''}`} />
        <span ref={core} aria-hidden className={`orb-core relative size-40 rounded-full sm:size-48 ${state === 'idle' ? 'orb-breathe' : ''} ${state === 'connecting' ? 'animate-pulse' : ''}`} />
      </button>
      <p className="text-lg font-semibold" role="status">{LABEL[state]}</p>
    </div>
  )
}
