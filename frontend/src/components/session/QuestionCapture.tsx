// "Didn't get this?" capture during a session. Q opens it (when not typing elsewhere).
import { useEffect, useRef, useState } from 'react'
import { addQuestion } from '../../lib/local'
import { Button } from '../ui'

export function QuestionCapture({ subjectId, subjectName, context }: { subjectId: number; subjectName: string; context?: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key.toLowerCase() === 'q' && !e.metaKey && !e.ctrlKey && !t.closest('input, textarea, select, [contenteditable]')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])

  const save = () => {
    if (!text.trim()) return
    addQuestion(context ? `${text.trim()}\n(while on: ${context})` : text.trim(), subjectId, subjectName)
    setText('')
    setSaved((n) => n + 1)
    setOpen(false)
  }

  return (
    <aside aria-label="Questions" className="rounded-(--radius-card) border border-dashed border-line p-4">
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setOpen(true)}>
            Didn't get something? <kbd className="rounded border border-line px-1 text-xs">Q</kbd>
          </Button>
          <span className="text-sm text-muted" role="status">
            {saved ? `${saved} saved to your questions. Answer them later.` : 'Park it here and keep going.'}
          </span>
        </div>
      ) : (
        <div>
          <label htmlFor="q-text" className="font-semibold">What didn't make sense?</label>
          <textarea
            id="q-text"
            ref={ref}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
              if (e.key === 'Escape') setOpen(false)
            }}
            className="mt-1 w-full rounded-(--radius-ctl) border border-line bg-bg p-2"
            placeholder="e.g. Why does doubling the table move most keys?"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="primary" onClick={save} disabled={!text.trim()}>Save question</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </aside>
  )
}
