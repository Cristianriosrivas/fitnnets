'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { Dumbbell } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

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
          Crea tu cuenta 💪
        </h1>
        <p className="text-sm text-[#9ca8a5] text-center mb-6">
          Tu mejor versión empieza hoy.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">
              Nombre de usuario
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
              placeholder="ej: carlos_fit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#9ca8a5] mb-1">
              Correo electrónico
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
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark w-full px-4 py-2.5 rounded-xl text-sm"
              placeholder="Mínimo 6 caracteres"
            />
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
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6b7876] mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-green-500 font-medium hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}