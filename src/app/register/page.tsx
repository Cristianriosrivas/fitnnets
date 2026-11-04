'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LockKeyhole, Mail, User } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { buildConsent } from '@/core/legal/consent'
import ConsentChecks from '@/components/ConsentChecks'
import AuthShell, { AuthField, GoogleButton, OrDivider } from '@/components/ui/AuthShell'
import GradientButton from '@/components/ui/GradientButton'
import { colors } from '@/components/ui/theme'

export default function RegisterPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [terms, setTerms] = useState(false)
  const [health, setHealth] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terms || !health) {
      setError('Debes aceptar las dos autorizaciones para crear tu cuenta.')
      return
    }
    setLoading(true)
    setError('')

    const consent = buildConsent()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // El consentimiento viaja en los metadatos: el trigger solo copia el username al perfil
        data: { username, ...consent },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Sin sesión: el proyecto exige confirmar el correo; el consentimiento se copia al primer ingreso
    if (!data.session) {
      setPendingEmail(true)
      setLoading(false)
      return
    }

    await supabase.from('profiles').update(consent).eq('id', data.session.user.id)
    router.push('/dashboard')
    router.refresh()
  }

  // Con Google no hay casillas aquí: la autorización se pide en /consent antes de entrar
  const handleGoogle = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (oauthError) setError('No se pudo continuar con Google')
  }

  if (pendingEmail) {
    return (
      <AuthShell title="Revisa tu correo" subtitle={'Te enviamos un enlace a ' + email + ' para activar tu cuenta.'}>
        <Link href="/login" className="btn-primary block text-center rounded-2xl py-3.5">Ir a iniciar sesión</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Crea tu cuenta 💪" subtitle="Tu mejor versión empieza hoy.">
      <form onSubmit={handleRegister}>
        <AuthField
          label="Nombre de usuario"
          icon={<User color={colors.muted} size={18} />}
          type="text"
          required
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ej: carlos_fit"
        />
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
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />

        <ConsentChecks terms={terms} health={health} onTermsChange={setTerms} onHealthChange={setHealth} />

        {error ? <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg mb-3">{error}</p> : null}

        <GradientButton
          type="submit"
          title={loading ? 'Creando cuenta...' : 'Registrarme'}
          loading={loading}
          className="w-full mt-1"
          style={{ opacity: terms && health ? 1 : 0.55 }}
        />
      </form>

      <OrDivider />
      <GoogleButton onClick={handleGoogle} />

      <p className="text-center text-sm text-[#6b7876] mt-6">
        {'¿Ya tienes cuenta? '}
        <Link href="/login" className="text-green-500 font-medium hover:underline">Inicia sesión</Link>
      </p>
    </AuthShell>
  )
}
