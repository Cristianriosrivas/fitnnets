// Paleta de Finnets, la misma de la app móvil: la base es fondo, verde, borde y texto secundario;
// los acentos y degradados dan profundidad a tarjetas, iconos y botones.
export const colors = {
  bg: '#0a0f0d',
  surface: '#141b19',
  surface2: '#1c2523',
  border: '#2a3532',
  primary: '#22c55e',
  lime: '#a3e635',
  teal: '#14b8a6',
  sky: '#38bdf8',
  violet: '#a78bfa',
  amber: '#f59e0b',
  orange: '#fb923c',
  rose: '#fb7185',
  gold: '#facc15',
  text: '#ffffff',
  soft: '#9ca8a5',
  muted: '#6b7876',
} as const

export type GradientColors = readonly [string, string, ...string[]]

export const gradients = {
  brand: ['#22c55e', '#a3e635'],
  forest: ['#15803d', '#064e3b'],
  ocean: ['#14b8a6', '#38bdf8'],
  ember: ['#fb923c', '#f43f5e'],
  violet: ['#a78bfa', '#6366f1'],
  gold: ['#facc15', '#f59e0b'],
  steel: ['#2a3532', '#1c2523'],
  run: ['#f97316', '#be123c'],
} as const satisfies Record<string, GradientColors>

type Direction = 'diagonal' | 'horizontal' | 'vertical'
const ANGLE: Record<Direction, string> = { diagonal: '135deg', horizontal: '90deg', vertical: '180deg' }

export const gradientCss = (stops: GradientColors, direction: Direction = 'diagonal') =>
  `linear-gradient(${ANGLE[direction]}, ${stops.join(', ')})`

// Sombra de color para elementos destacados
export const glow = (color: string, radius = 16, opacity = 0.45) => ({
  boxShadow: `0 6px ${radius * 1.6}px color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`,
})
