'use client'

import { useMemo } from 'react'
import { colors } from './theme'

const PALETTE = [colors.primary, colors.lime, colors.gold, colors.sky, colors.violet, colors.rose]

// Lluvia de confeti para celebrar; no estorba los clics
export default function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 12) * 90,
        duration: 1900 + ((i * 53) % 1300),
        size: 6 + (i % 4) * 2,
        color: PALETTE[i % PALETTE.length],
        round: i % 3 === 0,
      })),
    [count]
  )

  return (
    <div aria-hidden className="fixed inset-0 overflow-hidden pointer-events-none z-[60]">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${p.duration}ms`,
          }}
        />
      ))}
    </div>
  )
}
