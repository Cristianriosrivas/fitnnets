import type { CSSProperties, ReactNode } from 'react'

// Entrada en cascada: sube y aparece; delay en milisegundos
export default function FadeIn({ children, delay = 0, className = '', style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  return (
    <div className={`fade-in ${className}`} style={{ animationDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  )
}
