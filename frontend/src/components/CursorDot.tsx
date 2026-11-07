// The orange ripple trails the pointer, then blooms into hovered controls.
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
    let overControl: Element | null = null
    const move = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const target = e.target as Element | null
      const interactive = target?.closest('a, button, [role="button"], [role="tab"], input, select, textarea, label, summary') ?? null
      if (interactive !== overControl) {
        overControl?.removeAttribute('data-cursor-hover')
        interactive?.setAttribute('data-cursor-hover', 'true')
        overControl = interactive
        el.dataset.overControl = String(Boolean(interactive))
      }
      el.style.opacity = '1'
    }
    const leave = () => {
      el.style.opacity = '0'
      overControl?.removeAttribute('data-cursor-hover')
      overControl = null
    }
    const tick = () => {
      // Lerp toward the pointer so the dot trails slightly instead of sticking.
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      el.style.transform = `translate3d(${x - 8}px, ${y - 8}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      overControl?.removeAttribute('data-cursor-hover')
      cancelAnimationFrame(raf)
    }
  }, [active])

  if (!active) return null
  return (
    <div
      ref={dot}
      aria-hidden
      className="cursor-orb pointer-events-none fixed left-0 top-0 z-50 size-5 rounded-full opacity-0"
      style={{ willChange: 'transform, border-radius, background-color' }}
    />
  )
}
