'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/core/supabase/client'
import AuthShell, { AuthField } from '@/components/ui/AuthShell'
import GradientButton from '@/components/ui/GradientButton'
import { colors } from '@/components/ui/theme'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  const backToLogin = (
    <p className="text-center text-sm mt-6">
      <Link href="/login" className="text-green-500 font-medium hover:underline">Volver a iniciar sesión</Link>
    </p>
  )

  if (sent) {
    return (
      <AuthShell title="Revisa tu correo 📩" subtitle={'Te enviamos un link para restablecer tu contraseña a ' + email + '.'}>
        {backToLogin}
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un link para restablecerla.">
      <form onSubmit={handleSubmit}>
        <AuthField
          label="Correo electrónico"
          icon={<Mail color={colors.muted} size={18} />}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />

        {error ? <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mb-4">{error}</p> : null}

        <GradientButton type="submit" title={loading ? 'Enviando...' : 'Enviar link de recuperación'} loading={loading} className="w-full" />
      </form>
      {backToLogin}
    </AuthShell>
  )
}
