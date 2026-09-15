'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trophy } from 'lucide-react'

export default function RetosPage() {
  const supabase = createClient()
  const [myId, setMyId] = useState<string | null>(null)
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [metric, setMetric] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadChallenges = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setMyId(user.id)

    const { data } = await supabase
      .from('challenges')
      .select('id, title, description, metric, start_date, end_date, creator_id, challenge_participants(id, user_id, current_score, profiles(username))')
      .order('created_at', { ascending: false })

    setChallenges(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadChallenges()
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!title.trim() || !metric.trim()) {
      setError('El título y la métrica son obligatorios')
      return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: challenge, error: createError } = await supabase
      .from('challenges')
      .insert({
        creator_id: user.id,
        title,
        description,
        metric,
        start_date: new Date().toISOString().split('T')[0],
        end_date: endDate || null,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setSaving(false)
      return
    }

    // El creador se une automáticamente
    await supabase.from('challenge_participants').insert({
      challenge_id: challenge.id,
      user_id: user.id,
      current_score: 0,
    })

    setTitle('')
    setDescription('')
    setMetric('')
    setEndDate('')
    setShowCreate(false)
    setSaving(false)
    await loadChallenges()
  }

  const joinChallenge = async (challengeId: string) => {
    if (!myId) return
    await supabase.from('challenge_participants').insert({
      challenge_id: challengeId,
      user_id: myId,
      current_score: 0,
    })
    await loadChallenges()
  }

  const updateMyScore = async (challengeId: string, participantId: string, newScore: number) => {
    await supabase
      .from('challenge_participants')
      .update({ current_score: newScore })
      .eq('id', participantId)
    await loadChallenges()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Retos</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Crear reto
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del reto</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: Reto de 30 días de sentadillas"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ¿Qué se mide? (ej: flexiones totales, días consecutivos, kg levantados)
            </label>
            <input
              type="text"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              placeholder="ej: flexiones totales"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de finalización (opcional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-lg">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear reto'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Trophy className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-gray-500">Aún no hay retos.</p>
          <p className="text-sm text-gray-400 mt-1">Crea el primero 👆</p>
        </div>
      ) : (
        <div className="space-y-5">
          {challenges.map((challenge) => {
            const participants = (challenge.challenge_participants || [])
              .slice()
              .sort((a: any, b: any) => b.current_score - a.current_score)
            const myParticipation = participants.find((p: any) => p.user_id === myId)

            return (
              <div key={challenge.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-lg font-bold text-gray-900">{challenge.title}</h2>
                {challenge.description && (
                  <p className="text-sm text-gray-500 mt-1">{challenge.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1 capitalize">
                  Métrica: {challenge.metric}
                  {challenge.end_date && ` · Termina: ${new Date(challenge.end_date).toLocaleDateString('es-ES')}`}
                </p>

                {/* Tabla de posiciones */}
                <div className="mt-4 space-y-1.5">
                  {participants.map((p: any, index: number) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        p.user_id === myId ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{index + 1}</span>
                        <span className="text-sm text-gray-800">{p.profiles?.username}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{p.current_score}</span>
                    </div>
                  ))}
                </div>

                {/* Acción: unirse o actualizar mi puntaje */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {myParticipation ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={myParticipation.current_score}
                        onBlur={(e) =>
                          updateMyScore(challenge.id, myParticipation.id, parseInt(e.target.value) || 0)
                        }
                        className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <span className="text-xs text-gray-400">Actualiza tu puntaje aquí</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinChallenge(challenge.id)}
                      className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Unirme al reto
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}