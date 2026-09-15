'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { Search, UserPlus, Check, X, Users, Trophy } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  const loadSocialData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setMyId(user.id)

    // Amistades donde soy el que envió, y donde soy el que recibió
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, status, friend_id, profiles!friendships_friend_id_fkey(id, username)')
      .eq('user_id', user.id)

    const { data: received } = await supabase
      .from('friendships')
      .select('id, status, user_id, profiles!friendships_user_id_fkey(id, username)')
      .eq('friend_id', user.id)

    const acceptedFromSent = (sent || [])
      .filter((f) => f.status === 'aceptado')
      .map((f) => ({ id: f.id, profile: f.profiles }))
    const acceptedFromReceived = (received || [])
      .filter((f) => f.status === 'aceptado')
      .map((f) => ({ id: f.id, profile: f.profiles }))

    setFriends([...acceptedFromSent, ...acceptedFromReceived])
    setOutgoing((sent || []).filter((f) => f.status === 'pendiente'))
    setIncoming((received || []).filter((f) => f.status === 'pendiente'))

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
    await supabase.from('friendships').insert({
      user_id: myId,
      friend_id: friendId,
      status: 'pendiente',
    })
    setSearchResults((prev) => prev.filter((p) => p.id !== friendId))
    await loadSocialData()
  }

  const respondRequest = async (friendshipId: string, accept: boolean) => {
    if (accept) {
      await supabase
        .from('friendships')
        .update({ status: 'aceptado' })
        .eq('id', friendshipId)
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
    }
    await loadSocialData()
  }

  const cancelOutgoing = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadSocialData()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Social</h1>
        <Link
          href="/social/retos"
          className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 transition"
        >
          <Trophy size={16} />
          Ver retos
        </Link>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2">Buscar amigos</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por nombre de usuario..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-gray-100 text-gray-600 px-3 rounded-lg hover:bg-gray-200 transition"
          >
            <Search size={18} />
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5">
                <span className="text-sm text-gray-800">{p.username}</span>
                <button
                  onClick={() => sendRequest(p.id)}
                  className="flex items-center gap-1 text-xs text-green-600 font-medium hover:underline"
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
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <>
          {/* Solicitudes recibidas */}
          {incoming.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Solicitudes recibidas ({incoming.length})
              </p>
              <div className="space-y-2">
                {incoming.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3">
                    <span className="text-sm text-gray-800">{req.profiles?.username}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondRequest(req.id, true)}
                        className="bg-green-600 text-white p-1.5 rounded-lg hover:bg-green-700"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => respondRequest(req.id, false)}
                        className="bg-gray-100 text-gray-500 p-1.5 rounded-lg hover:bg-gray-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solicitudes enviadas (pendientes) */}
          {outgoing.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Solicitudes enviadas ({outgoing.length})
              </p>
              <div className="space-y-2">
                {outgoing.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3">
                    <span className="text-sm text-gray-500">{req.profiles?.username}</span>
                    <button
                      onClick={() => cancelOutgoing(req.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de amigos */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Users size={16} />
              Tus amigos ({friends.length})
            </p>
            {friends.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-sm">Aún no tienes amigos agregados.</p>
                <p className="text-xs text-gray-400 mt-1">Búscalos arriba por su nombre de usuario</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => (
                  <div key={f.id} className="flex items-center bg-white border border-gray-100 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold mr-3">
                      {f.profile?.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-800">{f.profile?.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}