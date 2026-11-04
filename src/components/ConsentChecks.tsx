import Link from 'next/link'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

function ConsentBox({ checked, onChange, label, children }: { checked: boolean; onChange: (value: boolean) => void; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`press mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-green-500 border-green-500' : 'bg-[#1c2523] border-[#2a3532]'}`}
      >
        {checked ? <Check size={15} color="#04120a" strokeWidth={3} /> : null}
      </button>
      <p className="text-sm text-[#c9d1cf] leading-5">{children}</p>
    </div>
  )
}

type Props = {
  terms: boolean
  health: boolean
  onTermsChange: (value: boolean) => void
  onHealthChange: (value: boolean) => void
}

// Las dos autorizaciones obligatorias (Ley 1581 de 2012). Se usan en el registro y en /consent.
export default function ConsentChecks({ terms, health, onTermsChange, onHealthChange }: Props) {
  return (
    <>
      <ConsentBox checked={terms} onChange={onTermsChange} label="Acepto los términos y la política de privacidad">
        {'Soy mayor de edad y acepto los '}
        <Link href="/terminos" target="_blank" className="text-green-500 hover:underline">Términos y condiciones</Link>
        {' y la '}
        <Link href="/privacidad" target="_blank" className="text-green-500 hover:underline">Política de privacidad</Link>
        .
      </ConsentBox>
      <ConsentBox checked={health} onChange={onHealthChange} label="Autorizo el tratamiento de mis datos de salud">
        Autorizo de forma expresa el tratamiento de mis datos de salud (peso, medidas y hábitos de entrenamiento y alimentación) para personalizar mis rutinas y mi plan de comidas.
      </ConsentBox>
    </>
  )
}
