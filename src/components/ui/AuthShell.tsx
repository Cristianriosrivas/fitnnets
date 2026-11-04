'use client'

import { useState } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'
import Aurora from './Aurora'
import FadeIn from './FadeIn'
import TiltCard from './TiltCard'
import { colors, glow, gradientCss, gradients } from './theme'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  icon: ReactNode
  secret?: boolean
}

// Campo con icono, borde verde al enfocarlo y, si es secreto, botón para ver la contraseña
export function AuthField({ label, icon, secret, ...input }: FieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="block mb-4">
      <span className="block text-xs font-semibold text-[#9ca8a5] mb-1.5 ml-1">{label}</span>
      <span className="auth-field flex items-center rounded-2xl px-3.5 min-h-[52px]">
        {icon}
        <input
          {...input}
          type={secret ? (visible ? 'text' : 'password') : input.type}
          className="flex-1 min-w-0 bg-transparent outline-none text-white text-[15px] py-3 px-2.5 placeholder:text-[#6b7876]"
        />
        {secret ? (
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="text-[#6b7876] hover:text-white p-1">
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </span>
    </label>
  )
}

// Marco de las pantallas de acceso: aurora animada, logo 3D flotante y tarjeta de vidrio
export default function AuthShell({ title, subtitle, children, wide = false }: { title: string; subtitle: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative min-h-screen bg-[#0a0f0d] overflow-hidden flex flex-col items-center justify-center px-5 py-12">
      <Aurora height="100%" />
      <div className={`relative w-full ${wide ? 'max-w-lg' : 'max-w-sm'}`}>
        <FadeIn className="flex flex-col items-center mb-6">
          <TiltCard float radius={26} maxTilt={14} style={glow(colors.primary, 26, 0.55)}>
            <div className="flex items-center justify-center" style={{ width: 76, height: 76, borderRadius: 26, background: gradientCss(gradients.brand) }}>
              <Dumbbell color="#04120a" size={36} strokeWidth={2.4} />
            </div>
          </TiltCard>
          <p className="text-white text-2xl font-extrabold mt-5" style={{ letterSpacing: 8 }}>FINNETS</p>
        </FadeIn>
        <FadeIn delay={140}>
          <div className="glass-card rounded-3xl p-6">
            <h1 className="text-white text-2xl font-extrabold">{title}</h1>
            <p className="text-[#9ca8a5] text-sm mt-1 mb-6">{subtitle}</p>
            {children}
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

// Botón secundario "Continuar con Google" con la G de colores
export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="press w-full flex items-center justify-center gap-3 rounded-2xl min-h-[52px] bg-[#1c2523] border border-[#2a3532] disabled:opacity-50">
      <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[14px] font-black" style={{ color: '#4285F4' }}>G</span>
      <span className="text-white font-semibold">Continuar con Google</span>
    </button>
  )
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[#2a3532]" />
      <span className="text-[#6b7876] text-xs">o</span>
      <div className="flex-1 h-px bg-[#2a3532]" />
    </div>
  )
}
