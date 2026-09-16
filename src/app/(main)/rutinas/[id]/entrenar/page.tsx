'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { CheckCircle2, X, SkipForward, ArrowLeft, ArrowRight, Timer } from 'lucide-react'

type FlatExercise = {
  id: string
  exercise_id: string
  name: string
  gif_url: string | null
  sets: number
  reps: string
  rest_seconds: number
}

export default function EntrenarPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any | null>(null)
  const [queue, setQueue] = useState<FlatExercise[]>([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<'exercise' | 'resting' | 'done'>('exercise')
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('routine_days')
        .select('id, day_number, title, routine_exercises(id, exercise_id, sets, reps, rest_seconds, order_index, exercises(name, gif_url))')
        .eq('routine_id', id)
        .order('day_number', { ascending: true })

      setDays(data || [])
      setLoading(false)
    }
    load()
  }, [id])

  const startDay = (day: any) => {
    const flat: FlatExercise[] = day.routine_exercises
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((ex: any) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        name: ex.exercises?.name || 'Ejercicio',
        gif_url: ex.exercises?.gif_url,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds || 60,
      }))

    setQueue(flat)
    setSelectedDay(day)
    setCurrentIndex(0)
    setCurrentSet(1)
    setPhase('exercise')
  }

  useEffect(() => {
    if (phase !== 'resting') return
    if (secondsLeft <= 0) {
      goToNextStep()
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft])

  const currentExercise = queue[currentIndex]

  const logProgress = useCallback(
    async (routineExerciseId: string, sets: number, reps: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('progress_logs').insert({
        user_id: user.id,
        routine_exercise_id: routineExerciseId,
        sets_completed: sets,
        reps_completed: reps,
      })
    },
    [supabase]
  )

  const goToNextStep = () => {
    if (!currentExercise) return
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1)
      setPhase('exercise')
      return
    }
    logProgress(currentExercise.id, currentExercise.sets, currentExercise.reps)
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1)
      setCurrentSet(1)
      setPhase('exercise')
    } else {
      setPhase('done')
    }
  }

  const goToPrevStep = () => {
    if (currentSet > 1) {
      setCurrentSet((s) => s - 1)
      setPhase('exercise')
    } else if (currentIndex > 0) {
      const prevEx = queue[currentIndex - 1]
      setCurrentIndex((i) => i - 1)
      setCurrentSet(prevEx.sets)
      setPhase('exercise')
    }
  }

  const handleCompleteSet = () => {
    if (!currentExercise) return
    setSecondsLeft(currentExercise.rest_seconds)
    setPhase('resting')
  }

  if (loading) {
    return <div className="p-8 text-center text-[#6b7876]">Cargando rutina...</div>
  }

  if (!selectedDay) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-xl font-bold text-white mb-1">¿Qué día vas a entrenar?</h1>
        <p className="text-sm text-[#9ca8a5] mb-6">Elige el día de tu rutina para comenzar</p>

        <div className="space-y-3">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => startDay(day)}
              className="card-dark card-dark-hover w-full text-left px-5 py-4"
            >
              <p className="font-semibold text-white">{day.title}</p>
              <p className="text-xs text-[#9ca8a5]">{day.routine_exercises?.length || 0} ejercicios</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
        <h1 className="text-2xl font-bold text-white">¡Entrenamiento completado! 🎉</h1>
        <p className="text-[#9ca8a5] mt-2">Excelente trabajo, sigue así.</p>
        <button
          onClick={() => router.push('/rutinas')}
          className="btn-primary mt-6 px-6 py-2.5 rounded-xl"
        >
          Volver a rutinas
        </button>
      </div>
    )
  }

  const totalCalories = queue.length * 15 // estimación simple

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/rutinas')} className="text-[#9ca8a5] hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{selectedDay.title}</h1>
          <p className="text-xs text-[#9ca8a5]">{queue.length} ejercicios</p>
        </div>
        <button onClick={() => router.push('/rutinas')} className="ml-auto text-[#6b7876] hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Stepper numerado */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {queue.map((_, i) => (
          <div
            key={i}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              i < currentIndex
                ? 'bg-green-500 text-[#052e14]'
                : i === currentIndex
                ? 'bg-green-500/20 border-2 border-green-500 text-green-500'
                : 'bg-[#141b19] text-[#6b7876] border border-[#2a3532]'
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
        {/* Tarjeta principal del ejercicio */}
        <div className="card-dark p-5">
          {currentExercise?.gif_url ? (
            <img
              src={currentExercise.gif_url}
              alt={currentExercise.name}
              className="w-full aspect-video md:aspect-[4/3] object-cover rounded-xl bg-[#1c2523] mb-4"
            />
          ) : (
            <div className="w-full aspect-video md:aspect-[4/3] rounded-xl bg-[#1c2523] mb-4" />
          )}
          <h2 className="text-xl font-bold text-white">{currentExercise?.name}</h2>
          <p className="text-sm text-[#9ca8a5] mt-1">
            {currentExercise?.sets} series x {currentExercise?.reps} reps
          </p>
        </div>

        {/* Panel lateral */}
        <div className="card-dark p-5 flex flex-col">
          {phase === 'resting' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 text-green-500 mb-2">
                <Timer size={16} />
                <p className="text-xs text-[#9ca8a5]">Descanso</p>
              </div>
              <p className="text-5xl font-bold text-white tabular-nums mb-4">{secondsLeft}s</p>
              <button
                onClick={goToNextStep}
                className="flex items-center gap-1.5 text-[#9ca8a5] text-xs font-medium hover:text-white"
              >
                <SkipForward size={14} />
                Saltar descanso
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#9ca8a5] mb-1">Serie actual</p>
              <p className="text-3xl font-bold text-white mb-4">
                {currentSet} <span className="text-base text-[#6b7876]">/ {currentExercise?.sets}</span>
              </p>

              <div className="bg-[#141b19] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#9ca8a5]">Repeticiones objetivo</p>
                <p className="text-sm font-semibold text-white mt-0.5">{currentExercise?.reps}</p>
              </div>

              <div className="bg-[#141b19] rounded-lg p-3 mb-5">
                <p className="text-xs text-[#9ca8a5] flex items-center gap-1.5">
                  <Timer size={12} /> Descanso
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">{currentExercise?.rest_seconds} segundos</p>
              </div>

              <button onClick={handleCompleteSet} className="btn-primary w-full py-3 rounded-xl mt-auto">
                Completar serie
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navegación anterior/siguiente */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={goToPrevStep}
          disabled={currentIndex === 0 && currentSet === 1}
          className="btn-secondary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm disabled:opacity-30"
        >
          <ArrowLeft size={16} />
          Anterior
        </button>
        <button
          onClick={phase === 'exercise' ? handleCompleteSet : goToNextStep}
          className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm"
        >
          Siguiente
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}