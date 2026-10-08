import { useEffect, useRef, useState } from 'react'

/** Eases a numeric value toward its target. Jumps immediately under reduced motion. */
export function useAnimatedNumber(target: number, duration = 450): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const valueRef = useRef(target)
  valueRef.current = value

  useEffect(() => {
    const reduced = document.documentElement.dataset.motion === 'reduce'
    if (reduced || fromRef.current === target) {
      fromRef.current = target
      setValue(target)
      return
    }
    const from = valueRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
