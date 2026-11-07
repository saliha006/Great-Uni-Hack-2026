// Session header: timer (adaptive / Pomodoro / untimed), simulated Do Not Disturb, attention chip.
import { useEffect, useState } from 'react'
import type { AttentionReading } from '../../api/types'
import { setLocal, useLocal, type TimerMode } from '../../lib/local'
import { Chip } from '../ui'

const fmt = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.floor(Math.abs(s) % 60)).padStart(2, '0')}`

export interface TimerInfo {
  mode: TimerMode
  label: string // e.g. "12:04 left"
  pomodoro: number // 1-based pomodoro index
  elapsedSec: number
}

// Wall-clock timer that pauses during breaks. Calls onPomodoroEnd / onPlannedEnd once each time.
export function useSessionTimer(plannedMin: number, paused: boolean, onPomodoroEnd: () => void, onPlannedEnd: () => void, initialSec = 0): TimerInfo {
  const { mode, work } = useLocal((s) => ({ mode: s.timerMode, work: s.pomodoroWork }))
  const [elapsed, setElapsed] = useState(initialSec)
  const [pomodoro, setPomodoro] = useState(() => Math.floor(initialSec / (work * 60)) + 1)
  const [plannedFired, setPlannedFired] = useState(initialSec >= plannedMin * 60)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [paused])

  useEffect(() => {
    if (mode === 'POMODORO' && elapsed > 0 && elapsed >= pomodoro * work * 60) {
      setPomodoro((p) => p + 1)
      onPomodoroEnd()
    }
    if (mode === 'ADAPTIVE' && !plannedFired && elapsed >= plannedMin * 60) {
      setPlannedFired(true)
      onPlannedEnd()
    }
  }, [elapsed, mode, pomodoro, work, plannedMin, plannedFired, onPomodoroEnd, onPlannedEnd])

  const label =
    mode === 'UNTIMED' ? `${fmt(elapsed)} so far`
      : mode === 'POMODORO' ? `${fmt(pomodoro * work * 60 - elapsed)} left in Pomodoro ${pomodoro}`
        : elapsed <= plannedMin * 60 ? `${fmt(plannedMin * 60 - elapsed)} left` : `${fmt(elapsed - plannedMin * 60)} over plan`
  return { mode, label, pomodoro, elapsedSec: elapsed }
}

const ATT: Record<AttentionReading['state'], { label: string; tone: 'ok' | 'warn' | 'accent' }> = {
  FOCUSED: { label: 'Focused', tone: 'ok' },
  DRIFTING: { label: 'Drifting', tone: 'warn' },
  LAPSED: { label: 'Lapsed', tone: 'accent' },
}

export function FocusBar({ timer, attention }: { timer: TimerInfo; attention: AttentionReading | null }) {
  const { dnd, showAttention, work, brk } = useLocal((s) => ({ dnd: s.dnd, showAttention: s.showAttention, work: s.pomodoroWork, brk: s.pomodoroBreak }))
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-extrabold tabular-nums" aria-live="off">{timer.label}</p>
        {showAttention && attention && <Chip tone={ATT[attention.state].tone}>{ATT[attention.state].label}</Chip>}
        <Chip>
          Do Not Disturb: {dnd.phone || dnd.laptop ? [dnd.phone && 'phone', dnd.laptop && 'laptop'].filter(Boolean).join(' + ') : 'off'}
          <span className="font-bold">(simulated)</span>
        </Chip>
        <button className="ml-auto text-sm font-semibold underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Focus settings
        </button>
      </div>
      {open && (
        <div className="mt-3 grid gap-4 rounded-(--radius-card) border border-line bg-surface p-4 sm:grid-cols-2">
          <fieldset>
            <legend className="font-semibold">Timer</legend>
            {([
              ['ADAPTIVE', 'Your focus window (recommended)'],
              ['POMODORO', `Pomodoro ${work}/${brk}`],
              ['UNTIMED', 'Untimed'],
            ] as const).map(([v, l]) => (
              <label key={v} className="mt-1 flex items-center gap-2">
                <input type="radio" name="timer" checked={timer.mode === v} onChange={() => setLocal({ timerMode: v })} /> {l}
              </label>
            ))}
            {timer.mode === 'POMODORO' && (
              <div className="mt-2 flex gap-3 text-sm">
                <label>Work <input type="number" min={5} max={60} value={work} onChange={(e) => setLocal({ pomodoroWork: Number(e.target.value) || 25 })} className="w-16 rounded border border-line bg-bg px-1" /> min</label>
                <label>Break <input type="number" min={1} max={30} value={brk} onChange={(e) => setLocal({ pomodoroBreak: Number(e.target.value) || 5 })} className="w-16 rounded border border-line bg-bg px-1" /> min</label>
              </div>
            )}
          </fieldset>
          <fieldset>
            <legend className="font-semibold">Do Not Disturb <span className="font-normal text-muted">(simulated)</span></legend>
            <p className="text-sm text-muted">A website can't change device settings. These toggles show how a companion app would sync it. Set Focus mode on your devices by hand for now.</p>
            <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={dnd.phone} onChange={(e) => setLocal((s) => ({ dnd: { ...s.dnd, phone: e.target.checked } }))} /> Phone</label>
            <label className="mt-1 flex items-center gap-2"><input type="checkbox" checked={dnd.laptop} onChange={(e) => setLocal((s) => ({ dnd: { ...s.dnd, laptop: e.target.checked } }))} /> Laptop</label>
            <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={showAttention} onChange={(e) => setLocal({ showAttention: e.target.checked })} /> Show attention chip</label>
          </fieldset>
        </div>
      )}
    </div>
  )
}
