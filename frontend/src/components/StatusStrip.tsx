// "Where am I, what's saved, what's next": shown on every page (Project.md hint).
import type { ReactNode } from 'react'
import { usingMock } from '../api/client'
import { lastSaveOk, useLocal } from '../lib/local'

export interface StatusItem {
  label: string
  value: ReactNode
}

export function StatusStrip({ where, items = [], next }: { where: string; items?: StatusItem[]; next?: string }) {
  useLocal((s) => s) // re-render when local state saves, so the save badge stays truthful
  return (
    <div role="status" aria-live="polite" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm">
        <span className="font-semibold">{where}</span>
        {items.map((i) => (
          <span key={i.label} className="text-muted">
            {i.label}: <span className="font-medium text-ink">{i.value}</span>
          </span>
        ))}
        {next && (
          <span className="text-muted">
            Next: <span className="font-medium text-ink">{next}</span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-2 text-muted">
          <span aria-hidden className={`size-2 rounded-full ${lastSaveOk ? 'bg-ok' : 'bg-accent'}`} />
          {lastSaveOk ? (usingMock ? 'Saved on this device (mock API)' : 'Synced with server') : 'Not saved: browser storage is blocked'}
        </span>
      </div>
    </div>
  )
}
