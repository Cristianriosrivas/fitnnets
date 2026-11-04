import type { CSSProperties } from 'react'
import { colors } from './theme'

type OrbProps = {
  color: string
  size: number
  style?: CSSProperties
  duration?: number
  intensity?: number
}

// Esfera de luz difusa que deriva y respira lentamente
export function GlowOrb({ color, size, style, duration = 18, intensity = 0.5 }: OrbProps) {
  return (
    <div
      aria-hidden
      className="aurora-orb"
      style={{
        width: size,
        height: size,
        animationDuration: `${duration}s`,
        background: `radial-gradient(circle, color-mix(in srgb, ${color} ${Math.round(intensity * 100)}%, transparent) 0%, color-mix(in srgb, ${color} ${Math.round(intensity * 35)}%, transparent) 45%, transparent 70%)`,
        ...style,
      }}
    />
  )
}

// Fondo "aurora": luces de marca que se mueven detrás del contenido
export default function Aurora({ height = 420 }: { height?: number | string }) {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 overflow-hidden pointer-events-none" style={{ height }}>
      <GlowOrb color={colors.primary} size={340} style={{ top: -150, left: -110 }} duration={18} intensity={0.42} />
      <GlowOrb color={colors.teal} size={280} style={{ top: -60, right: -130 }} duration={22} intensity={0.32} />
      <GlowOrb color={colors.lime} size={220} style={{ top: '45%', left: 40 }} duration={26} intensity={0.16} />
    </div>
  )
}
