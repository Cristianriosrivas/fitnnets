'use client'

import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { RotateCw } from 'lucide-react'
import BodyMap, { BodySide, BodyVariant } from './BodyMap'
import { colors } from '../ui/theme'
import type { Region } from '@/core/muscles'

type Props = {
  variant: BodyVariant
  values: Partial<Record<Region, number>>
  width: number
  colorFor?: (region: Region, value: number) => string
  selected?: Region | null
  onSelect?: (region: Region) => void
  glowColor?: string
  showControls?: boolean
}

// Cuerpo que gira en 3D: se arrastra de lado a lado para ver frente y espalda (con perspectiva),
// se mece solo hasta que lo tocas y se apoya sobre un halo de luz.
export default function Body3D({ variant, values, width, colorFor, selected, onSelect, glowColor = colors.primary, showControls = true }: Props) {
  const height = width * 2.2
  const [rotation, setRotation] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [swaying, setSwaying] = useState(true)
  const drag = useRef<{ x: number; base: number; moved: boolean; last: number; speed: number } | null>(null)

  const normalized = ((rotation % 360) + 360) % 360
  const side: BodySide = normalized > 90 && normalized < 270 ? 'back' : 'front'

  const handleDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, base: rotation, moved: false, last: e.timeStamp, speed: 0 }
  }

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < 8) return
    if (!d.moved) {
      d.moved = true
      setSwaying(false)
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    d.speed = e.movementX / Math.max(1, e.timeStamp - d.last)
    d.last = e.timeStamp
    setRotation(d.base + dx * 0.9)
  }

  const handleUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    setDragging(false)
    setRotation((current) => {
      let snapped = Math.round(current / 180) * 180
      // Un deslizamiento rápido gira al otro lado aunque el arrastre sea corto
      if (snapped === d.base && Math.abs(d.speed) > 0.5) snapped += d.speed > 0 ? 180 : -180
      return snapped
    })
  }

  const face = (faceSide: BodySide, angle: number) => (
    <div className="body-face" style={{ transform: `rotateY(${angle}deg)`, pointerEvents: side === faceSide ? 'auto' : 'none' }}>
      <BodyMap variant={variant} side={faceSide} values={values} width={width} colorFor={colorFor} selected={selected} onSelect={onSelect} />
    </div>
  )

  return (
    <div className="flex flex-col items-center">
      <div
        className="body-stage relative"
        style={{ width, height: height + 18 }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      >
        {/* Halo de luz bajo los pies */}
        <div
          aria-hidden
          className="absolute left-0 right-0 pointer-events-none"
          style={{ bottom: -4, height: 44, background: `radial-gradient(ellipse 42% 32% at 50% 50%, color-mix(in srgb, ${glowColor} 45%, transparent), transparent)` }}
        />
        <div className={swaying ? 'body-sway absolute inset-0' : 'absolute inset-0'} style={{ transformStyle: 'preserve-3d' }}>
          <div
            className="absolute inset-0"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${rotation}deg)`,
              transition: dragging ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.3, 0.64, 1)',
            }}
          >
            {face('front', 0)}
            {face('back', 180)}
          </div>
        </div>
      </div>

      {showControls ? (
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[#9ca8a5] text-xs font-semibold">{side === 'front' ? 'Frente' : 'Espalda'}</span>
          <button
            type="button"
            onClick={() => { setSwaying(false); setRotation((r) => Math.round(r / 180) * 180 + 180) }}
            className="press flex items-center gap-1.5 bg-[#1c2523] border border-[#2a3532] rounded-full px-3 py-1.5"
            aria-label="Girar el cuerpo"
          >
            <RotateCw color={colors.primary} size={13} />
            <span className="text-white text-xs font-semibold">Girar</span>
          </button>
          <span className="text-[#6b7876] text-[11px]">o arrastra de lado</span>
        </div>
      ) : null}
    </div>
  )
}
