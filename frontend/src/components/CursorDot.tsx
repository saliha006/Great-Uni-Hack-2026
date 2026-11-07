// Orange dot that trails the pointer and grows over interactive controls.
// Off on touch screens, with reduced motion, inside study sessions, or when switched off.
import { useEffect, useRef, useState } from 'react'

export function CursorDot({ enabled }: { enabled: boolean }) {
  const dot = useRef<HTMLDivElement>(null)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    const update = () => setAllowed(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const active = enabled && allowed

  useEffect(() => {
    if (!active) return
    const el = dot.current
    if (!el) return
    let x = -100, y = -100, tx = -100, ty = -100, raf = 0
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const target = e.target as Element | null
      const interactive = target?.closest('a, button, [role="button"], [role="tab"], input, select, textarea, label, summary')
      el.style.opacity = interactive ? '0' : '1'
    }
    const leave = () => { el.style.opacity = '0' }
    const tick = () => {
      // Lerp toward the pointer so the dot trails slightly instead of sticking.
      x += (tx - x) * 0.22
      y += (ty - y) * 0.22
      el.style.transform = `translate3d(${x - 8}px, ${y - 8}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [active])

  if (!active) return null
  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 size-4 rounded-full opacity-0 transition-opacity duration-200"
      style={{ backgroundColor: 'var(--color-interaction)', willChange: 'transform' }}
    />
  )
}
