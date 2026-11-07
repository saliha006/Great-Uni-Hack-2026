import { useEffect, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { hasSeededData } from '../api/client'
import { setLocal, useLocal } from '../lib/local'
import { CursorDot } from './CursorDot'
import { StatusStrip, type StatusItem } from './StatusStrip'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/progress', label: 'Progress' },
  { to: '/questions', label: 'Questions' },
  { to: '/dev', label: 'Dev' },
]

export function PageShell({
  children, where, status = [], next, focus = false,
}: { children: ReactNode; where: string; status?: StatusItem[]; next?: string; focus?: boolean }) {
  const cursorDot = useLocal((s) => s.cursorDot)
  const theme = useLocal((s) => s.theme)
  const openQuestions = useLocal((s) => s.questions.filter((q) => !q.resolved).length)
  const { pathname } = useLocation()

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
        Skip to content
      </a>
      {!focus && (
        <header className="bg-bg">
          <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3">
            <NavLink to="/" className="mr-4 flex items-center gap-2 text-xl font-extrabold tracking-tight no-underline">
              <span aria-hidden className="size-3 rounded-full bg-accent" />
              Attune
            </NavLink>
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-(--radius-ctl) px-3 py-2 text-sm font-semibold no-underline ${isActive ? 'bg-ink text-bg' : 'text-ink hover:bg-sunken'}`
                }
              >
                {l.label}
                {l.to === '/questions' && openQuestions > 0 && (
                  <span className="ml-1.5 rounded-full bg-accent px-1.5 text-xs text-accent-ink" aria-label={`${openQuestions} open`}>
                    {openQuestions}
                  </span>
                )}
              </NavLink>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {hasSeededData() && (
                <span className="rounded-full border border-ink px-2 py-0.5 text-xs font-bold uppercase" title="Multi-week history is seeded for the demo">
                  Demo data
                </span>
              )}
              <label className="flex items-center gap-1.5 text-sm text-muted">
                <span className="sr-only sm:not-sr-only">Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setLocal({ theme: e.target.value as 'system' | 'light' | 'dark' })}
                  className="rounded-(--radius-ctl) border border-line bg-surface px-2 py-1 text-ink"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>
          </nav>
        </header>
      )}
      <StatusStrip where={where} items={status} next={next} />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <CursorDot enabled={cursorDot && !focus && !pathname.startsWith('/session')} />
    </div>
  )
}
