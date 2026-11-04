import type { CSSProperties } from 'react'

// Bloque gris con brillo que recorre mientras cargan los datos
export default function Skeleton({ height, width = '100%', radius = 12, style, className = '' }: { height: number; width?: number | string; radius?: number; style?: CSSProperties; className?: string }) {
  return <div className={`skeleton ${className}`} style={{ height, width, borderRadius: radius, ...style }} />
}
