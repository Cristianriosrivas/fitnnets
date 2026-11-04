'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { createClient } from '@/core/supabase/client'
import AuthShell, { AuthField } from '@/components/ui/AuthShell'
import GradientButton from '@/components/ui/GradientButton'
import { colors } from '@/components/ui/theme'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  }

  if (success) {
    return (
      <AuthShell title="¡Contraseña actualizada! ✅" subtitle="Te llevaremos al login en un momento...">
        <span />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Nueva contraseña" subtitle="Escribe tu nueva contraseña.">
      <form onSubmit={handleSubmit}>
        <AuthField
          label="Nueva contraseña"
          icon={<LockKeyhole color={colors.muted} size={18} />}
          secret
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />

        {error ? <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mb-4">{error}</p> : null}

        <GradientButton type="submit" title={loading ? 'Guardando...' : 'Actualizar contraseña'} loading={loading} className="w-full" />
      </form>
    </AuthShell>
  )
}
