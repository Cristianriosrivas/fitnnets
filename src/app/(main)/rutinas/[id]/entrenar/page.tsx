'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { CheckCircle2, X, SkipForward } from 'lucide-react'

type FlatExercise = {
  id: string
  exercise_id: string
  name: string
  gif_url: string | null
  sets: number
  reps: string
  rest_seconds: number
  dayTitle: string
}

export default function EntrenarPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<any[]>([])
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [queue, setQueue] = useState<FlatExercise[]>([])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<'exercise' | 'resting' | 'done'>('exercise')
  const [secondsLeft, setSecondsLeft] = useState(0)

  // 1. Cargar la rutina y sus días
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

  // 2. Cuando el usuario elige un día, armar la "cola" de ejercicios
  const startDay = (dayId: string) => {
    const day = days.find((d) => d.id === dayId)
    if (!day) return

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
        dayTitle: day.title,
      }))

    setQueue(flat)
    setSelectedDayId(dayId)
    setCurrentIndex(0)
    setCurrentSet(1)
    setPhase('exercise')
  }

  // 3. Cronómetro de descanso
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

    // ¿Quedan series de este ejercicio?
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1)
      setPhase('exercise')
      return
    }

    // Se acabaron las series de este ejercicio -> registrar progreso
    logProgress(currentExercise.id, currentExercise.sets, currentExercise.reps)

    // ¿Hay más ejercicios?
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1)
      setCurrentSet(1)
      setPhase('exercise')
    } else {
      setPhase('done')
    }
  }

  const handleCompleteSet = () => {
    if (!currentExercise) return
    setSecondsLeft(currentExercise.rest_seconds)
    setPhase('resting')
  }

  const handleSkipRest = () => {
    goToNextStep()
  }

  // ---------- RENDER ----------

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando rutina...</div>
  }

  // Pantalla de selección de día (si no ha elegido uno todavía)
  if (!selectedDayId) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900 mb-1">¿Qué día vas a entrenar?</h1>
        <p className="text-sm text-gray-400 mb-6">Elige el día de tu rutina para comenzar</p>

        <div className="space-y-3">
          {days.map((day) => (
            <button
              key={day.id}
              onClick={() => startDay(day.id)}
              className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 bg-white hover:border-green-500 transition"
            >
              <p className="font-semibold text-gray-900">{day.title}</p>
              <p className="text-xs text-gray-400">
                {day.routine_exercises?.length || 0} ejercicios
              </p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Pantalla de "entrenamiento completado"
  if (phase === 'done') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto text-green-600 mb-4" size={56} />
        <h1 className="text-2xl font-bold text-gray-900">¡Entrenamiento completado! 🎉</h1>
        <p className="text-gray-500 mt-2">Excelente trabajo, sigue así.</p>
        <button
          onClick={() => router.push('/rutinas')}
          className="mt-6 bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition"
        >
          Volver a rutinas
        </button>
      </div>
    )
  }

  // Pantalla de descanso (cronómetro)
  if (phase === 'resting') {
    const nextIsNewExercise = currentSet >= currentExercise.sets
    const nextLabel = nextIsNewExercise
      ? queue[currentIndex + 1]?.name || 'Finalizar'
      : `Serie ${currentSet + 1} de ${currentExercise.sets}`

    return (
      <div className="max-w-md mx-auto px-4 py-10 text-center">
        <p className="text-sm text-gray-400 mb-2">Descanso</p>
        <div className="text-6xl font-bold text-green-600 mb-6 tabular-nums">
          {secondsLeft}s
        </div>
        <p className="text-sm text-gray-500 mb-8">Siguiente: {nextLabel}</p>

        <button
          onClick={handleSkipRest}
          className="flex items-center gap-2 mx-auto text-gray-500 text-sm font-medium hover:text-gray-800 transition"
        >
          <SkipForward size={16} />
          Saltar descanso
        </button>
      </div>
    )
  }

  // Pantalla del ejercicio actual
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">
          Ejercicio {currentIndex + 1} de {queue.length}
        </p>
        <button onClick={() => router.push('/rutinas')} className="text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      {currentExercise?.gif_url ? (
        <img
          src={currentExercise.gif_url}
          alt={currentExercise.name}
          className="w-full aspect-square object-cover rounded-2xl bg-gray-100 mb-5"
        />
      ) : (
        <div className="w-full aspect-square rounded-2xl bg-gray-100 mb-5" />
      )}

      <h1 className="text-xl font-bold text-gray-900">{currentExercise?.name}</h1>
      <p className="text-sm text-gray-500 mt-1">
        Serie {currentSet} de {currentExercise?.sets} · {currentExercise?.reps} repeticiones
      </p>

      <button
        onClick={handleCompleteSet}
        className="w-full mt-8 bg-green-600 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition"
      >
        Completar serie
      </button>
    </div>
  )
}