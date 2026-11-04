'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

type Props = {
  value: number
  decimals?: number
  duration?: number
  delay?: number
  prefix?: string
  suffix?: string
  className?: string
  style?: CSSProperties
}

// Número que sube animado hasta su valor; los decimales van con coma
export default function CountUp({ value, decimals = 0, duration = 900, delay = 0, prefix = '', suffix = '', className, style }: Props) {
  const [display, setDisplay] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    const from = shown.current
    let frame = 0
    let start = 0
    const tick = (now: number) => {
      start ||= now
      const t = Math.min(1, (now - start) / duration)
      const next = from + (value - from) * (1 - Math.pow(1 - t, 3))
      shown.current = next
      setDisplay(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => { frame = requestAnimationFrame(tick) }, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [value, duration, delay])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix + display.toFixed(decimals).replace('.', ',') + suffix}
    </span>
  )
}
