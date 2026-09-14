'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { Sparkles, Loader2, Play, PlusCircle } from 'lucide-react'
import Link from 'next/link'

export default function RutinasPage() {
  const supabase = createClient()
  const [routines, setRoutines] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [loadingList, setLoadingList] = useState(true)

  const loadRoutines = async () => {
    setLoadingList(true)
    const { data } = await supabase
      .from('routines')
      .select('id, title, goal, created_at, routine_days(id, day_number, title, routine_exercises(id, sets, reps, rest_seconds, exercises(name, muscle_group, gif_url)))')
      .order('created_at', { ascending: false })

    setRoutines(data || [])
    setLoadingList(false)
  }

  useEffect(() => {
    loadRoutines()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')

    const res = await fetch('/api/generate-routine', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Error al generar la rutina')
      setGenerating(false)
      return
    }

    await loadRoutines()
    setGenerating(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tus Rutinas</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex-1"
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generando con IA...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generar rutina con IA
            </>
          )}
        </button>

        <Link
          href="/rutinas/nueva"
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition flex-1"
        >
          <PlusCircle size={16} />
          Crear rutina personalizada
        </Link>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>
      )}

      {loadingList ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : routines.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500">Aún no tienes rutinas.</p>
          <p className="text-sm text-gray-400 mt-1">Genera una con IA o crea la tuya propia 👆</p>
        </div>
      ) : (
        <div className="space-y-6">
          {routines.map((routine) => (
            <div key={routine.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-gray-900">{routine.title}</h2>
                <Link
                  href={`/rutinas/${routine.id}/entrenar`}
                  className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-700 transition flex-shrink-0"
                >
                  <Play size={14} />
                  Iniciar rutina
                </Link>
              </div>
              <p className="text-xs text-gray-400 mb-4 capitalize">{routine.goal}</p>

              <div className="space-y-5">
                {routine.routine_days
                  ?.sort((a: any, b: any) => a.day_number - b.day_number)
                  .map((day: any) => (
                    <div key={day.id} className="border-t border-gray-100 pt-4">
                      <p className="font-semibold text-sm text-gray-800 mb-3">{day.title}</p>
                      <div className="space-y-3">
                        {day.routine_exercises?.map((ex: any) => {
                          const exerciseName = ex.exercises?.name || 'Ejercicio'
                          const gifUrl = ex.exercises?.gif_url
                          const detailText = ex.sets + ' series x ' + ex.reps + ' reps'

                          return (
                            <div
                              key={ex.id}
                              className="flex items-center gap-3 bg-gray-50 rounded-xl p-2 border border-gray-100"
                            >
                              {gifUrl ? (
                                <img
                                  src={gifUrl}
                                  alt={exerciseName}
                                  className="w-14 h-14 object-cover rounded-lg bg-white flex-shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {exerciseName}
                                </p>
                                <p className="text-xs text-gray-400">{detailText}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}