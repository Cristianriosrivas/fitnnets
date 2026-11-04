'use client'

import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { gradients, GradientColors } from './theme'

type Props = {
  progress: number // 0-100
  size?: number
  stroke?: number
  colors?: GradientColors
  trackColor?: string
  duration?: number
  delay?: number
  // Valor inicial del anillo (100 para un cronómetro que se vacía)
  from?: number
  linear?: boolean
  children?: ReactNode
}

// Anillo de progreso con trazo en degradado que se llena animado
export default function AnimatedRing({
  progress, size = 96, stroke = 10, colors = gradients.brand, trackColor = '#1f2926',
  duration = 1100, delay = 0, from = 0, linear = false, children,
}: Props) {
  const id = 'r' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const [value, setValue] = useState(from)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setValue(Math.max(0, Math.min(100, progress))))
    return () => cancelAnimationFrame(frame)
  }, [progress])

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {colors.map((c, i) => (
              <stop key={c + i} offset={i / (colors.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          style={{ transition: `stroke-dashoffset ${duration}ms ${linear ? 'linear' : 'cubic-bezier(0.22, 1, 0.36, 1)'} ${delay}ms` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
