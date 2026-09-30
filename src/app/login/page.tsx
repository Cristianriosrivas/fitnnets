'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { Dumbbell } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

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
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (oauthError) {
      setError('No se pudo iniciar sesion con Google')
    }
  }

  const forgotPasswordText = 'Olvidaste tu contrasena?'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] px-4">
      <div className="w-full max-w-sm card-dark p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-green-500/15 text-green-500 p-2 rounded-xl">
            <Dumbbell size={22} />
          </div>
          <span className="font-bold text-xl text-white">Finnets</span>
        </div>

        <h1 className="text-xl font-bold text-center mb-1 text-white">
          Bienvenido de nuevo
        </h1>
        <p className="text-sm text-[#9ca8a5] text-center mb-6">
          Disciplina hoy, resultados manana.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">
              Correo electronico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">
              Contrasena
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
              placeholder="********"
            />
            <div className="flex justify-end mt-2">
              <a href="/forgot-password" className="text-xs text-green-500 hover:underline">
                {forgotPasswordText}
              </a>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#2a3532]" />
          <span className="text-xs text-[#6b7876]">o</span>
          <div className="flex-1 h-px bg-[#2a3532]" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.2 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.2 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.3C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.3C41.5 36.2 44 30.6 44 24c0-1.3-.1-2.7-.4-3.9z" />
          </svg>
          <span className="text-white">Continuar con Google</span>
        </button>

        <p className="text-center text-sm text-[#6b7876] mt-6">
          No tienes cuenta?{' '}
          <a href="/register" className="text-green-500 font-medium hover:underline">
            Registrate
          </a>
        </p>
      </div>
    </div>
  )
}
