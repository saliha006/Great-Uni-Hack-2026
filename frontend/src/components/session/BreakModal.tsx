// Calm break with a countdown. Ending early is fine; no guilt copy.
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui'

export function BreakModal({ seconds, message, onEnd }: { seconds: number; message: string; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const m = Math.floor(left / 60), s = String(left % 60).padStart(2, '0')
  return (
    <dialog
      ref={ref}
      onCancel={(e) => { e.preventDefault(); onEnd() }}
      aria-labelledby="break-h"
      className="m-auto w-[min(92vw,30rem)] rounded-(--radius-card) border border-line bg-surface p-8 text-ink backdrop:bg-black/50"
    >
      <h2 id="break-h" className="text-2xl font-extrabold">Take a breather</h2>
      <p className="mt-2 text-lg">{message}</p>
      <p className="my-6 text-6xl font-extrabold tabular-nums" aria-live="off">{m}:{s}</p>
      <p className="text-muted">Stand up, get some water, look away from the screen. Your place is saved.</p>
      <div className="mt-6 flex gap-3">
        <Button variant="primary" onClick={onEnd} autoFocus>{left === 0 ? "I'm back" : 'End break early'}</Button>
      </div>
    </dialog>
  )
}
