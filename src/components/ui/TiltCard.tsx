'use client'

import { useRef } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  radius?: number
  maxTilt?: number
  // Flota y se mece despacio, como si estuviera suspendida
  float?: boolean
  // Un brillo diagonal la recorre cada pocos segundos (efecto holográfico)
  glare?: boolean
  onClick?: () => void
  ariaLabel?: string
}

// Tarjeta 3D: se inclina hacia el cursor o el dedo y se hunde un poco. Escribe el giro directo
// en el estilo del elemento para no volver a pintar React en cada movimiento.
export default function TiltCard({ children, className = '', style, radius = 24, maxTilt = 9, float = false, glare = false, onClick, ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const box = el.getBoundingClientRect()
    const nx = ((e.clientX - box.left) / box.width) * 2 - 1
    const ny = ((e.clientY - box.top) / box.height) * 2 - 1
    el.style.setProperty('--tilt-x', `${(-ny * maxTilt).toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${(nx * maxTilt).toFixed(2)}deg`)
    el.style.setProperty('--tilt-scale', '0.985')
  }

  const handleLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
    el.style.setProperty('--tilt-scale', '1')
  }

  return (
    <div className={float ? 'tilt-float' : undefined}>
      <div
        ref={ref}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onPointerUp={handleLeave}
        onPointerCancel={handleLeave}
        className={`tilt-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
        style={{ borderRadius: radius, ...style }}
      >
        {children}
        {glare ? (
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: radius }}>
            <div className="tilt-glare" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
