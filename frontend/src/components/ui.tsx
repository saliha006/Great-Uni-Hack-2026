// Shared layout primitives. Saliha's Insights page reuses Card, Chip and PageShell (brief: Interfaces).
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg' | 'sm'
const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(
    'inline-flex items-center justify-center gap-2 rounded-(--radius-ctl) font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    size === 'lg' && 'min-h-14 px-6 text-lg',
    size === 'md' && 'min-h-11 px-4 text-base',
    size === 'sm' && 'min-h-9 px-3 text-sm',
    variant === 'primary' && 'bg-accent text-accent-ink hover:brightness-110',
    variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-sunken',
    variant === 'ghost' && 'text-ink hover:bg-sunken',
    className,
  )

export function Button({ variant = 'secondary', size = 'md', className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...rest} className={buttonClass(variant, size, className)} />
}

// Navigation styled as a button: one interactive element, not a <button> inside an <a>.
export function ButtonLink({ variant = 'secondary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link {...rest} className={buttonClass(variant, size, className)} />
}

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <As {...rest} className={cx('rounded-(--radius-card) border border-line bg-surface p-5', className)}>
      {children}
    </As>
  )
}

type Tone = 'neutral' | 'accent' | 'ok' | 'warn'
export function Chip({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium',
        tone === 'neutral' && 'bg-sunken text-ink',
        tone === 'accent' && 'bg-accent-soft text-ink',
        tone === 'ok' && 'bg-ok-soft text-ink',
        tone === 'warn' && 'bg-warn-soft text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Meter({ value, label, className }: { value: number | null; label: string; className?: string }) {
  const pct = value === null ? 0 : Math.round(value * 100)
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-sm text-muted">
        <span>{label}</span>
        <span>{value === null ? 'not enough data' : `${pct}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sunken" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-muted">
      <span className="size-3 animate-pulse rounded-full bg-accent" aria-hidden />
      {label}…
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-(--radius-card) border border-accent bg-accent-soft p-4">
      <p className="font-semibold">Something didn't load.</p>
      <p className="mt-1 text-sm">{error instanceof Error ? error.message : String(error)}</p>
      {onRetry && (
        <Button size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export { cx }
