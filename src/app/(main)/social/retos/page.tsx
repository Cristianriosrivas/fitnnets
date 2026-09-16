'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Trophy, Users } from 'lucide-react'

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

    await supabase.from('challenge_participants').insert({ challenge_id: challenge.id, user_id: user.id, current_score: 0 })

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
    await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: myId, current_score: 0 })
    await loadChallenges()
  }

  const updateMyScore = async (participantId: string, newScore: number) => {
    await supabase.from('challenge_participants').update({ current_score: newScore }).eq('id', participantId)
    await loadChallenges()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/social" className="text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-white flex-1">Retos</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
        >
          <Plus size={16} />
          Crear reto
        </button>
      </div>

      {showCreate && (
        <div className="card-dark p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Título del reto</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: Reto de 30 días de sentadillas"
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Descripción (opcional)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">¿Qué se mide?</label>
            <input
              type="text" value={metric} onChange={(e) => setMetric(e.target.value)}
              placeholder="ej: flexiones totales"
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1">Fecha de finalización (opcional)</label>
            <input
              type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</p>}

          <button onClick={handleCreate} disabled={saving} className="btn-primary w-full py-2.5 rounded-lg text-sm disabled:opacity-50">
            {saving ? 'Creando...' : 'Crear reto'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-[#6b7876] text-sm">Cargando...</p>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 card-dark">
          <Trophy className="mx-auto text-[#2a3532] mb-2" size={32} />
          <p className="text-[#9ca8a5]">Aún no hay retos.</p>
          <p className="text-sm text-[#6b7876] mt-1">Crea el primero 👆</p>
        </div>
      ) : (
        <div className="space-y-5">
          {challenges.map((challenge) => {
            const participants = (challenge.challenge_participants || []).slice().sort((a: any, b: any) => b.current_score - a.current_score)
            const myParticipation = participants.find((p: any) => p.user_id === myId)

            return (
              <div key={challenge.id} className="card-dark p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{challenge.title}</h2>
                    {challenge.description && <p className="text-sm text-[#9ca8a5] mt-1">{challenge.description}</p>}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-[#6b7876] bg-[#141b19] px-2.5 py-1 rounded-full flex-shrink-0">
                    <Users size={12} /> {participants.length}
                  </span>
                </div>
                <p className="text-xs text-[#6b7876] mt-2 capitalize">
                  Métrica: {challenge.metric}
                  {challenge.end_date && ` · Termina: ${new Date(challenge.end_date).toLocaleDateString('es-ES')}`}
                </p>

                <div className="mt-4 space-y-1.5">
                  {participants.map((p: any, index: number) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        p.user_id === myId ? 'bg-green-500/10 border border-green-500/30' : 'bg-[#141b19]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold w-5 ${index === 0 ? 'text-yellow-400' : 'text-[#6b7876]'}`}>
                          {index + 1}
                        </span>
                        <span className="text-sm text-white">{p.profiles?.username}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{p.current_score}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#1f2926]">
                  {myParticipation ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        defaultValue={myParticipation.current_score}
                        onBlur={(e) => updateMyScore(myParticipation.id, parseInt(e.target.value) || 0)}
                        className="input-dark w-24 px-3 py-1.5 rounded-lg text-sm"
                      />
                      <span className="text-xs text-[#6b7876]">Actualiza tu puntaje aquí</span>
                    </div>
                  ) : (
                    <button onClick={() => joinChallenge(challenge.id)} className="btn-primary text-sm px-4 py-2 rounded-lg">
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