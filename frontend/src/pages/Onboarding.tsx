import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api, usingMock } from '../api/client'
import type { Subject, SubjectKind } from '../api/types'
import { PageShell } from '../components/PageShell'
import { Button, ButtonLink, Card, ErrorBox } from '../components/ui'
import { useStartSession } from '../lib/useStartSession'

const STEPS = ['Subject', 'Material', 'Calibration'] as const
const MIN_WORDS = 900

export function Onboarding() {
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SubjectKind>('KNOWLEDGE')
  const [exam, setExam] = useState('')
  const [text, setText] = useState('')
  const [subject, setSubject] = useState<Subject | null>(null)
  const [chunks, setChunks] = useState(0)
  const start = useStartSession()

  const words = text.split(/\s+/).filter(Boolean).length

  const create = useMutation({
    mutationFn: () => api.createSubject({ name: name.trim(), kind, exam_date: exam || null }),
    onSuccess: (s) => {
      setSubject(s)
      setStep(1)
      qc.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
  const material = useMutation({
    mutationFn: () => api.addMaterial(subject!.id, { title: `${subject!.name} notes`, text }),
    onSuccess: (r) => {
      setChunks(r.chunk_count)
      setStep(2)
      qc.invalidateQueries({ queryKey: ['subjects'] })
    },
  })

  const onFile = async (f: File | undefined) => {
    if (!f) return
    // Plain text is read here; PDF extraction (pypdf) needs the backend's multipart upload.
    if (f.type === 'application/pdf') {
      alert(usingMock ? 'PDF upload needs the backend. Paste the text for now.' : 'PDF upload is coming; paste the text for now.')
      return
    }
    setText(await f.text())
  }

  const submitSubject = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <PageShell
      where="Add a subject"
      status={[{ label: 'Step', value: `${step + 1} of 3 · ${STEPS[step]}` }]}
      next={step === 0 ? 'Add your notes' : step === 1 ? 'Calibration' : 'Round 1'}
    >
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full ${i <= step ? 'bg-ink' : 'bg-line'}`} />
            <span className={`mt-1 block text-sm ${i === step ? 'font-semibold' : 'text-muted'}`}>{s}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card className="max-w-xl">
          <form onSubmit={submitSubject} className="space-y-5">
            <h1 className="text-2xl font-extrabold">What are you studying?</h1>
            <label className="block">
              <span className="font-semibold">Subject name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Structures"
                className="mt-1 w-full rounded-(--radius-ctl) border border-line bg-bg px-3 py-2.5 text-base"
              />
            </label>
            <fieldset>
              <legend className="font-semibold">What kind of subject?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  ['PERFORMANCE', 'Problem-solving', 'Maths, coding, anything you solve'],
                  ['KNOWLEDGE', 'Knowledge', 'Theory, languages, humanities'],
                ] as const).map(([v, label, hint]) => (
                  <label key={v} className={`cursor-pointer rounded-(--radius-ctl) border p-3 ${kind === v ? 'border-ink bg-sunken' : 'border-line'}`}>
                    <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="mr-2" />
                    <span className="font-semibold">{label}</span>
                    <span className="mt-1 block text-sm text-muted">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="font-semibold">Exam date</span> <span className="text-muted">(optional)</span>
              <input type="date" value={exam} onChange={(e) => setExam(e.target.value)} className="mt-1 block rounded-(--radius-ctl) border border-line bg-bg px-3 py-2.5" />
            </label>
            {create.isError && <ErrorBox error={create.error} />}
            <Button variant="primary" type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Saving…' : 'Continue'}
            </Button>
          </form>
        </Card>
      )}

      {step === 1 && subject && (
        <Card className="max-w-2xl">
          <h1 className="text-2xl font-extrabold">Add notes for {subject.name}</h1>
          <p className="mt-1 text-muted">Paste lecture notes or a reading. Sessions use one ~300-word chunk at a time.</p>
          <label className="mt-4 block">
            <span className="font-semibold">Your material</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-(--radius-ctl) border border-line bg-bg p-3 text-base leading-relaxed"
              placeholder="Paste text here…"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className={words > 0 && words < MIN_WORDS ? 'font-semibold text-warn' : 'text-muted'}>
              {words} words{words > 0 && words < MIN_WORDS ? ` · about ${MIN_WORDS} gives three good calibration rounds` : ''}
            </span>
            <label className="ml-auto cursor-pointer font-semibold underline">
              Upload a .txt file
              <input type="file" accept=".txt,.md,text/plain,application/pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
          {material.isError && <div className="mt-3"><ErrorBox error={material.error} /></div>}
          <div className="mt-5 flex gap-3">
            <Button variant="primary" onClick={() => material.mutate()} disabled={!words || material.isPending}>
              {material.isPending ? 'Splitting into chunks…' : 'Save material'}
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
          </div>
        </Card>
      )}

      {step === 2 && subject && (
        <Card className="max-w-xl">
          <h1 className="text-2xl font-extrabold">Quick calibration</h1>
          <p className="mt-2 text-lg leading-relaxed">
            Three short rounds of about 15 minutes, one per study method: Active Recall, Practice Test and Feynman. Each ends with the same 5-question check, so the methods are compared fairly.
          </p>
          <p className="mt-2 text-muted">Saved {chunks} chunk{chunks === 1 ? '' : 's'}. You can split the rounds across days.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={() => start.mutate({ subjectId: subject.id, subjectName: subject.name })} disabled={start.isPending}>
              Start round 1
            </Button>
            <ButtonLink to="/">Go to Home</ButtonLink>
            <Button
              variant="ghost"
              onClick={() => {
                setStep(0); setName(''); setText(''); setExam(''); setSubject(null)
              }}
            >
              Add another subject
            </Button>
          </div>
          {start.isError && <div className="mt-3"><ErrorBox error={start.error} /></div>}
        </Card>
      )}
    </PageShell>
  )
}
