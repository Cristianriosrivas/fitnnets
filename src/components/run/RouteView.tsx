import { useId } from 'react'
import type { LatLng } from '@/core/running'
import { colors } from '../ui/theme'

type Props = {
  route: LatLng[]
  width: number
  height: number
  // En vivo: el punto final late y no hay marca de llegada
  live?: boolean
  // Margen interno; las miniaturas usan uno menor
  pad?: number
}

// Dibuja la ruta sin mapas (no necesita claves de Google ni conexión): proyección simple
// lat/lng -> x/y, ajustada al recuadro conservando la forma, con trazo en degradado.
// width y height son el tamaño lógico: el dibujo se escala al ancho de su contenedor.
export default function RouteView({ route, width, height, live = false, pad = 18 }: Props) {
  const id = 'route' + useId().replace(/[^a-zA-Z0-9]/g, '')

  const grid = (
    <>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={'h' + f} x1={0} x2={width} y1={height * f} y2={height * f} stroke="#1f2926" strokeWidth={1} strokeDasharray="4 6" />
      ))}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={'v' + f} y1={0} y2={height} x1={width * f} x2={width * f} stroke="#1f2926" strokeWidth={1} strokeDasharray="4 6" />
      ))}
    </>
  )

  if (route.length < 2) {
    return (
      <div className="relative w-full flex items-center justify-center" style={{ aspectRatio: `${width} / ${height}` }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full h-full">{grid}</svg>
        <p className="relative text-xs" style={{ color: colors.muted }}>{live ? 'Tu ruta aparecerá aquí al moverte' : 'Ruta no disponible en este dispositivo'}</p>
      </div>
    )
  }

  // Proyección equirectangular: corrige la longitud por la latitud media
  const meanLat = (route.reduce((s, p) => s + p[0], 0) / route.length) * (Math.PI / 180)
  const xs = route.map((p) => p[1] * Math.cos(meanLat))
  const ys = route.map((p) => -p[0])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 1e-6)
  const spanY = Math.max(maxY - minY, 1e-6)
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY)
  const offsetX = (width - spanX * scale) / 2
  const offsetY = (height - spanY * scale) / 2
  const pts = xs.map((x, i) => [offsetX + (x - minX) * scale, offsetY + (ys[i] - minY) * scale])
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [sx, sy] = pts[0]
  const [ex, ey] = pts[pts.length - 1]
  const small = width < 120

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
      <defs>
        <linearGradient id={id} x1={sx} y1={sy} x2={ex} y2={ey} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="0.5" stopColor="#a3e635" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {small ? null : grid}
      {/* Resplandor bajo la línea */}
      <path d={d} stroke="#22c55e" strokeOpacity={0.18} strokeWidth={small ? 5 : 12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={`url(#${id})`} strokeWidth={small ? 2 : 4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={sx} cy={sy} r={small ? 2.5 : 6} fill="#22c55e" stroke="#0a0f0d" strokeWidth={small ? 1 : 2} />
      {live ? (
        <>
          <circle cx={ex} cy={ey} r={14} fill="#ffffff" className="pulse-soft" />
          <circle cx={ex} cy={ey} r={6} fill="#ffffff" stroke="#0a0f0d" strokeWidth={2} />
        </>
      ) : (
        <circle cx={ex} cy={ey} r={small ? 2.5 : 6} fill="#f59e0b" stroke="#0a0f0d" strokeWidth={small ? 1 : 2} />
      )}
    </svg>
  )
}
