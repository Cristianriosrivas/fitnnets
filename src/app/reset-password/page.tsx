'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { Dumbbell } from 'lucide-react'

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d] px-4">
      <div className="w-full max-w-sm card-dark p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-green-500/15 text-green-500 p-2 rounded-xl">
            <Dumbbell size={22} />
          </div>
          <span className="font-bold text-xl text-white">Finnets</span>
        </div>

        {success ? (
          <div className="text-center">
            <h1 className="text-lg font-bold text-white mb-2">¡Contraseña actualizada! ✅</h1>
            <p className="text-sm text-[#9ca8a5]">Te llevaremos al login en un momento...</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-center mb-6 text-white">
              Escribe tu nueva contraseña
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9ca8a5] mb-1">
                  Nueva contraseña
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
                {loading ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}