import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { glow, gradientCss, gradients, GradientColors } from './theme'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string
  icon?: ReactNode
  colors?: GradientColors
  loading?: boolean
  textColor?: string
}

// Botón principal con degradado, resplandor y rebote al pulsarlo
export default function GradientButton({ title, icon, colors = gradients.brand, loading = false, textColor = '#04120a', className = '', style, disabled, ...button }: Props) {
  const off = disabled || loading
  return (
    <button
      {...button}
      disabled={off}
      className={`press flex items-center justify-center gap-2 rounded-2xl px-5 min-h-[52px] font-bold text-[15px] disabled:opacity-50 ${className}`}
      style={{ background: gradientCss(colors, 'horizontal'), color: textColor, ...(off ? {} : glow(colors[0], 14, 0.4)), ...style }}
    >
      {loading ? <span className="spinner" aria-hidden /> : icon}
      {title}
    </button>
  )
}
