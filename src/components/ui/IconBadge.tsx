import type { ReactNode } from 'react'
import { glow, gradientCss, GradientColors } from './theme'

type Props = {
  colors: GradientColors
  children: ReactNode
  size?: number
  radius?: number
  shine?: boolean
}

// Icono sobre un cuadro con degradado y resplandor de su color
export default function IconBadge({ colors, children, size = 44, radius = 14, shine = true }: Props) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, borderRadius: radius, background: gradientCss(colors), ...(shine ? glow(colors[0], 10, 0.4) : {}) }}
    >
      {children}
    </div>
  )
}
