'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ShieldCheck } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { buildConsent } from '@/core/legal/consent'
import { LEGAL_INFO } from '@/core/legal/content'
import ConsentChecks from '@/components/ConsentChecks'
import AuthShell from '@/components/ui/AuthShell'
import GradientButton from '@/components/ui/GradientButton'
import { colors } from '@/components/ui/theme'

// Usuarios sin la autorización vigente (cuentas antiguas, Google o cambio de versión de la política)
export default function ConsentPage() {
  const router = useRouter()
  const [terms, setTerms] = useState(false)
  const [health, setHealth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    if (!terms || !health) {
      setError('Debes aceptar las dos autorizaciones para continuar.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    // .select('id') devuelve las filas actualizadas: si viene vacío, la base de datos rechazó el cambio
    const { data, error: updateError } = await supabase.from('profiles').update(buildConsent()).eq('id', user.id).select('id')

    if (updateError || !data || data.length === 0) {
      setError('No se pudo guardar tu autorización. Revisa tu conexión e intenta de nuevo.')
      setSaving(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: 'local' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <AuthShell
      wide
      title="Antes de continuar"
      subtitle="Para usar Finnets necesitamos tu autorización para tratar tus datos personales, incluidos tus datos de salud, según la Ley 1581 de 2012. Puedes revocarla cuando quieras eliminando tu cuenta."
    >
      <div className="flex items-center gap-3 bg-[#1c2523] rounded-2xl p-3 mb-5">
        <ShieldCheck color={colors.primary} size={20} className="flex-shrink-0" />
        <p className="text-[#c9d1cf] text-xs leading-4">
          Tus datos de salud solo se usan para personalizar tus rutinas y tu plan de comidas. No los vendemos ni los usamos para publicidad.
        </p>
      </div>

      <ConsentChecks terms={terms} health={health} onTermsChange={setTerms} onHealthChange={setHealth} />

      {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}

      <GradientButton
        title={saving ? 'Guardando...' : 'Aceptar y continuar'}
        onClick={handleAccept}
        loading={saving}
        icon={<Check color="#04120a" size={18} strokeWidth={3} />}
        className="w-full mt-1.5"
        style={{ opacity: terms && health ? 1 : 0.55 }}
      />

      <button type="button" onClick={handleSignOut} disabled={saving} className="w-full mt-4 py-2 text-[#9ca8a5] text-sm hover:text-white">
        No acepto, cerrar sesión
      </button>

      <p className="text-[#6b7876] text-xs text-center mt-3">{'Dudas o solicitudes sobre tus datos: ' + LEGAL_INFO.email}</p>
    </AuthShell>
  )
}
