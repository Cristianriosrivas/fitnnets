'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { Search, UserPlus, Check, X, Users, Trophy, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function SocialPage() {
  const supabase = createClient()
  const [myId, setMyId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const [friends, setFriends] = useState<any[]>([])
  const [incoming, setIncoming] = useState<any[]>([])
  const [outgoing, setOutgoing] = useState<any[]>([])
  const [topChallenges, setTopChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadSocialData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    const { data: sent } = await supabase
      .from('friendships')
      .select('id, status, friend_id, profiles!friendships_friend_id_fkey(id, username)')
      .eq('user_id', user.id)

    const { data: received } = await supabase
      .from('friendships')
      .select('id, status, user_id, profiles!friendships_user_id_fkey(id, username)')
      .eq('friend_id', user.id)

    const acceptedFromSent = (sent || []).filter((f) => f.status === 'aceptado').map((f) => ({ id: f.id, profile: f.profiles }))
    const acceptedFromReceived = (received || []).filter((f) => f.status === 'aceptado').map((f) => ({ id: f.id, profile: f.profiles }))

    setFriends([...acceptedFromSent, ...acceptedFromReceived])
    setOutgoing((sent || []).filter((f) => f.status === 'pendiente'))
    setIncoming((received || []).filter((f) => f.status === 'pendiente'))

    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, metric, challenge_participants(id)')
      .order('created_at', { ascending: false })
      .limit(3)

    setTopChallenges(challenges || [])
    setLoading(false)
  }

  useEffect(() => {
    loadSocialData()
  }, [])

  const handleSearch = async () => {
    if (!searchTerm.trim() || !myId) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', `%${searchTerm}%`)
      .neq('id', myId)
      .limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  const sendRequest = async (friendId: string) => {
    if (!myId) return
    await supabase.from('friendships').insert({ user_id: myId, friend_id: friendId, status: 'pendiente' })
    setSearchResults((prev) => prev.filter((p) => p.id !== friendId))
    await loadSocialData()
  }

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    if (accept) {
      await supabase.from('friendships').update({ status: 'aceptado' }).eq('id', friendshipId)
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
    await loadSocialData()
  }

  const cancelOutgoing = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadSocialData()
  }

  const initials = (name: string) => name?.[0]?.toUpperCase() || '?'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Social</h1>
          <p className="text-sm text-[#9ca8a5] mt-0.5">Entrena en comunidad y compite con tus amigos.</p>
        </div>
        <Link href="/social/retos" className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl">
          <Trophy size={16} />
          Ver retos
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Columna principal */}
        <div>
          {/* Buscador */}
          <div className="card-dark p-4 mb-5">
            <p className="text-sm font-medium text-white mb-2">Buscar amigos</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por nombre de usuario..."
                className="input-dark flex-1 px-3 py-2 rounded-lg text-sm"
              />
              <button onClick={handleSearch} disabled={searching} className="btn-secondary px-3 rounded-lg">
                <Search size={18} />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-[#141b19] rounded-lg p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-xs font-bold">
                        {initials(p.username)}
                      </div>
                      <span className="text-sm text-white">{p.username}</span>
                    </div>
                    <button
                      onClick={() => sendRequest(p.id)}
                      className="flex items-center gap-1 text-xs text-green-500 font-medium hover:underline"
                    >
                      <UserPlus size={14} />
                      Agregar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-[#6b7876] text-sm">Cargando...</p>
          ) : (
            <>
              {incoming.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-white mb-2">Solicitudes recibidas ({incoming.length})</p>
                  <div className="space-y-2">
                    {incoming.map((req) => (
                      <div key={req.id} className="card-dark p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-xs font-bold">
                            {initials(req.profiles?.username)}
                          </div>
                          <span className="text-sm text-white">{req.profiles?.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => respondRequest(req.id, true)} className="bg-green-500 text-[#052e14] p-1.5 rounded-lg hover:bg-green-600">
                            <Check size={14} />
                          </button>
                          <button onClick={() => respondRequest(req.id, false)} className="bg-[#1c2523] text-[#9ca8a5] p-1.5 rounded-lg hover:bg-[#2a3532]">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outgoing.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-white mb-2">Solicitudes enviadas ({outgoing.length})</p>
                  <div className="space-y-2">
                    {outgoing.map((req) => (
                      <div key={req.id} className="card-dark p-3 flex items-center justify-between">
                        <span className="text-sm text-[#9ca8a5]">{req.profiles?.username}</span>
                        <button onClick={() => cancelOutgoing(req.id)} className="text-xs text-[#6b7876] hover:text-red-400">
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                  <Users size={16} className="text-green-500" />
                  Tus amigos ({friends.length})
                </p>
                {friends.length === 0 ? (
                  <div className="text-center py-10 card-dark">
                    <p className="text-[#9ca8a5] text-sm">Aún no tienes amigos agregados.</p>
                    <p className="text-xs text-[#6b7876] mt-1">Búscalos arriba por su nombre de usuario</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {friends.map((f) => (
                      <div key={f.id} className="card-dark flex items-center p-3">
                        <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                          {initials(f.profile?.username)}
                        </div>
                        <span className="text-sm text-white truncate">{f.profile?.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Panel lateral: retos destacados */}
        <div className="card-dark p-4 h-fit">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Trophy size={15} className="text-green-500" />
              Retos activos
            </p>
            <Link href="/social/retos" className="text-xs text-green-500 hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {topChallenges.length === 0 ? (
            <p className="text-xs text-[#6b7876]">Aún no hay retos creados.</p>
          ) : (
            <div className="space-y-3">
              {topChallenges.map((c) => (
                <Link
                  key={c.id}
                  href="/social/retos"
                  className="block bg-[#141b19] rounded-lg p-3 hover:bg-[#1c2523] transition"
                >
                  <p className="text-sm font-medium text-white truncate">{c.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-[#6b7876] capitalize">{c.metric}</span>
                    <span className="text-xs text-green-500">{c.challenge_participants?.length || 0} participantes</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}