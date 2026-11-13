import { useEffect } from 'react'

export function useRecordConfetti(ref, enabled) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const { default: confetti } = await import('@hiseb/confetti')
        if (cancelled || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const bounds = ref.current.getBoundingClientRect()
        confetti({
          position: { x: bounds.left + bounds.width / 2, y: Math.max(0, Math.min(window.innerHeight, bounds.top + 60)) },
          count: 100, velocity: 180, fade: true,
          color: ['#ffd60a', '#30d158', '#0a84ff', '#ff375f']
        })
      } catch { /* The record remains available if the animation cannot be loaded. */ }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [ref, enabled])
}
