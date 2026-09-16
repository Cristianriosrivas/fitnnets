'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/core/supabase/client'
import { Sparkles, Loader2, PlusCircle, Clock, Repeat, Dumbbell, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function RutinasPage() {
  const supabase = createClient()
  const [routines, setRoutines] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [filter, setFilter] = useState<string>('todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadRoutines = async () => {
    setLoadingList(true)
    const { data } = await supabase
      .from('routines')
      .select('id, title, goal, generated_by_ai, created_at, routine_days(id, day_number, title, routine_exercises(id, sets, reps, rest_seconds, exercises(name, muscle_group, gif_url)))')
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

  const dayFilters = useMemo(() => {
    const counts = new Set(routines.filter((r) => r.generated_by_ai).map((r) => r.routine_days?.length || 0))
    return Array.from(counts).filter(Boolean).sort((a, b) => a - b)
  }, [routines])

  const filteredRoutines = routines.filter((r) => {
    if (filter === 'todas') return true
    if (filter === 'personalizada') return !r.generated_by_ai
    return (r.routine_days?.length || 0) === parseInt(filter)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Tus Rutinas</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Generando...' : 'Generar con IA'}
          </button>
          <Link
            href="/rutinas/nueva"
            className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl"
          >
            <PlusCircle size={16} />
            Crear rutina personalizada
          </Link>
        </div>
      </div>

      {/* Filtros por pestañas */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
        <button
          onClick={() => setFilter('todas')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            filter === 'todas' ? 'bg-green-500 text-[#052e14]' : 'bg-[#141b19] text-[#9ca8a5] border border-[#2a3532]'
          }`}
        >
          Todas
        </button>
        {dayFilters.map((d) => (
          <button
            key={d}
            onClick={() => setFilter(String(d))}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === String(d) ? 'bg-green-500 text-[#052e14]' : 'bg-[#141b19] text-[#9ca8a5] border border-[#2a3532]'
            }`}
          >
            {d} Días
          </button>
        ))}
        <button
          onClick={() => setFilter('personalizada')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
            filter === 'personalizada' ? 'bg-green-500 text-[#052e14]' : 'bg-[#141b19] text-[#9ca8a5] border border-[#2a3532]'
          }`}
        >
          Personalizada
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">{error}</p>
      )}

      {loadingList ? (
        <p className="text-[#6b7876] text-sm">Cargando...</p>
      ) : filteredRoutines.length === 0 ? (
        <div className="text-center py-16 card-dark">
          <p className="text-[#9ca8a5]">No hay rutinas en esta categoría.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRoutines.map((routine, index) => {
            const isExpanded = expandedId === routine.id
            const totalExercises = routine.routine_days?.reduce(
              (sum: number, d: any) => sum + (d.routine_exercises?.length || 0),
              0
            )
            const thumbnail = routine.routine_days?.[0]?.routine_exercises?.[0]?.exercises?.gif_url
            const setsRange = routine.routine_days?.[0]?.routine_exercises?.[0]?.sets
            const restAvg = routine.routine_days?.[0]?.routine_exercises?.[0]?.rest_seconds

            return (
              <div
                key={routine.id}
                className={`card-dark p-4 sm:p-5 ${index === 0 ? 'border-green-500/50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-20 h-32 sm:h-20 rounded-xl overflow-hidden bg-[#1c2523] flex-shrink-0">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#2a3532]">
                        <Dumbbell size={28} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-white">{routine.title}</h2>
                        <p className="text-xs text-[#9ca8a5] capitalize">
                          {routine.generated_by_ai ? routine.goal?.replace('_', ' ') : 'Rutina personalizada'}
                        </p>
                      </div>
                      <Link
                        href={`/rutinas/${routine.id}/entrenar`}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap flex-shrink-0 ${
                          index === 0 ? 'btn-primary' : 'btn-secondary'
                        }`}
                      >
                        Iniciar rutina
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-[#9ca8a5]">
                      <span className="flex items-center gap-1">
                        <Dumbbell size={13} /> {routine.routine_days?.length || 0} días
                      </span>
                      {setsRange && (
                        <span className="flex items-center gap-1">
                          <Repeat size={13} /> {setsRange} series
                        </span>
                      )}
                      {restAvg && (
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {restAvg} seg descanso
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : routine.id)}
                      className="flex items-center gap-1 text-xs text-green-500 font-medium mt-3 hover:underline"
                    >
                      {isExpanded ? 'Ocultar detalles' : `Ver detalles (${totalExercises} ejercicios)`}
                      <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1f2926] space-y-5">
                    {routine.routine_days
                      ?.sort((a: any, b: any) => a.day_number - b.day_number)
                      .map((day: any) => (
                        <div key={day.id}>
                          <p className="font-semibold text-sm text-white mb-2.5">{day.title}</p>
                          <div className="space-y-2">
                            {day.routine_exercises?.map((ex: any) => (
                              <div key={ex.id} className="flex items-center gap-3 bg-[#141b19] rounded-lg p-2">
                                {ex.exercises?.gif_url ? (
                                  <img
                                    src={ex.exercises.gif_url}
                                    alt=""
                                    className="w-11 h-11 object-cover rounded-lg bg-[#1c2523] flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg bg-[#1c2523] flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm text-white truncate">{ex.exercises?.name}</p>
                                  <p className="text-xs text-[#6b7876]">
                                    {ex.sets} series x {ex.reps} reps
                                  </p>
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
          })}
        </div>
      )}
    </div>
  )
}