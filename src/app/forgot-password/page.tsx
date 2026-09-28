'use client'

import { useState } from 'react'
import { createClient } from '@/core/supabase/client'
import { Dumbbell } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] px-4">
      <div className="w-full max-w-sm card-dark p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-green-500/15 text-green-500 p-2 rounded-xl">
            <Dumbbell size={22} />
          </div>
          <span className="font-bold text-xl text-white">Finnets</span>
        </div>

        {sent ? (
          <div className="text-center">
            <h1 className="text-lg font-bold text-white mb-2">Revisa tu correo 📩</h1>
            <p className="text-sm text-[#9ca8a5]">
              Te enviamos un link para restablecer tu contraseña a <strong className="text-white">{email}</strong>.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-center mb-1 text-white">
              Recuperar contraseña
            </h1>
            <p className="text-sm text-[#9ca8a5] text-center mb-6">
              Te enviaremos un link para restablecerla.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
          </>
        )}

        <p className="text-center text-sm text-[#6b7876] mt-6">
          <a href="/login" className="text-green-500 font-medium hover:underline">
            Volver a iniciar sesión
          </a>
        </p>
      </div>
    </div>
  )
}