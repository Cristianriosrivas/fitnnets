'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import AuthShell, { AuthField, GoogleButton, OrDivider } from '@/components/ui/AuthShell'
import GradientButton from '@/components/ui/GradientButton'
import { colors } from '@/components/ui/theme'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })

    if (oauthError) {
      setError('No se pudo iniciar sesión con Google')
    }
  }

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Disciplina hoy, resultados mañana.">
      <form onSubmit={handleLogin}>
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
        <AuthField
          label="Contraseña"
          icon={<LockKeyhole color={colors.muted} size={18} />}
          secret
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <div className="flex justify-end -mt-2 mb-4">
          <Link href="/forgot-password" className="text-xs text-green-500 hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>

        {error ? <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mb-4">{error}</p> : null}

        <GradientButton type="submit" title={loading ? 'Ingresando...' : 'Iniciar sesión'} loading={loading} className="w-full" />
      </form>

      <OrDivider />
      <GoogleButton onClick={handleGoogleLogin} />

      <p className="text-center text-sm text-[#6b7876] mt-6">
        {'¿No tienes cuenta? '}
        <Link href="/register" className="text-green-500 font-medium hover:underline">Regístrate</Link>
      </p>
    </AuthShell>
  )
}
