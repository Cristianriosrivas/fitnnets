'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/core/supabase/client'
import { Plus, Trash2 } from 'lucide-react'

type ExerciseCatalogItem = {
  id: string
  name: string
  muscle_group: string
  gif_url: string | null
}

type DayExercise = {
  exercise_id: string
  name: string
  sets: number
  reps: string
  rest_seconds: number
}

type DayBlock = {
  title: string
  exercises: DayExercise[]
}

export default function NuevaRutinaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [catalog, setCatalog] = useState<ExerciseCatalogItem[]>([])
  const [routineTitle, setRoutineTitle] = useState('')
  const [days, setDays] = useState<DayBlock[]>([
    { title: 'Día 1', exercises: [] },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCatalog = async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, gif_url')
        .order('name')
      setCatalog(data || [])
    }
    loadCatalog()
  }, [])

  const addDay = () => {
    setDays((prev) => [...prev, { title: `Día ${prev.length + 1}`, exercises: [] }])
  }

  const removeDay = (dayIndex: number) => {
    setDays((prev) => prev.filter((_, i) => i !== dayIndex))
  }

  const updateDayTitle = (dayIndex: number, title: string) => {
    setDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, title } : d))
    )
  }

  const addExerciseToDay = (dayIndex: number) => {
    if (catalog.length === 0) return
    const first = catalog[0]
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              exercises: [
                ...d.exercises,
                { exercise_id: first.id, name: first.name, sets: 3, reps: '10-12', rest_seconds: 60 },
              ],
            }
          : d
      )
    )
  }

  const removeExerciseFromDay = (dayIndex: number, exIndex: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIndex) }
          : d
      )
    )
  }

  const updateExercise = (
    dayIndex: number,
    exIndex: number,
    field: keyof DayExercise,
    value: string | number
  ) => {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const newExercises = d.exercises.map((ex, j) => {
          if (j !== exIndex) return ex
          if (field === 'exercise_id') {
            const found = catalog.find((c) => c.id === value)
            return { ...ex, exercise_id: value as string, name: found?.name || ex.name }
          }
          return { ...ex, [field]: value }
        })
        return { ...d, exercises: newExercises }
      })
    )
  }

  const handleSave = async () => {
    setError('')

    if (!routineTitle.trim()) {
      setError('Ponle un nombre a tu rutina')
      return
    }
    if (days.some((d) => d.exercises.length === 0)) {
      setError('Cada día debe tener al menos un ejercicio')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión no encontrada')
      setSaving(false)
      return
    }

    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        title: routineTitle,
        generated_by_ai: false,
      })
      .select()
      .single()

    if (routineError) {
      setError(routineError.message)
      setSaving(false)
      return
    }

    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const { data: routineDay, error: dayError } = await supabase
        .from('routine_days')
        .insert({
          routine_id: routine.id,
          day_number: i + 1,
          title: day.title,
        })
        .select()
        .single()

      if (dayError) {
        setError(dayError.message)
        setSaving(false)
        return
      }

      const exercisesToInsert = day.exercises.map((ex, index) => ({
        routine_day_id: routineDay.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        order_index: index,
      }))

      const { error: exError } = await supabase
        .from('routine_exercises')
        .insert(exercisesToInsert)

      if (exError) {
        setError(exError.message)
        setSaving(false)
        return
      }
    }

    router.push('/rutinas')
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear rutina personalizada</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de la rutina
        </label>
        <input
          type="text"
          value={routineTitle}
          onChange={(e) => setRoutineTitle(e.target.value)}
          placeholder="ej: Mi rutina de fuerza"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={day.title}
                onChange={(e) => updateDayTitle(dayIndex, e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
              {days.length > 1 && (
                <button
                  onClick={() => removeDay(dayIndex)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {day.exercises.map((ex, exIndex) => (
                <div
                  key={exIndex}
                  className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-3"
                >
                  <select
                    value={ex.exercise_id}
                    onChange={(e) => updateExercise(dayIndex, exIndex, 'exercise_id', e.target.value)}
                    className="flex-1 min-w-[140px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                  >
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={ex.sets}
                    onChange={(e) => updateExercise(dayIndex, exIndex, 'sets', parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                    placeholder="Series"
                  />

                  <input
                    type="text"
                    value={ex.reps}
                    onChange={(e) => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                    placeholder="Reps"
                  />

                  <input
                    type="number"
                    value={ex.rest_seconds}
                    onChange={(e) => updateExercise(dayIndex, exIndex, 'rest_seconds', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                    placeholder="Desc. (s)"
                  />

                  <button
                    onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                    className="text-gray-400 hover:text-red-500 ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addExerciseToDay(dayIndex)}
              className="flex items-center gap-1.5 text-green-600 text-sm font-medium mt-3 hover:underline"
            >
              <Plus size={16} />
              Agregar ejercicio
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addDay}
        className="flex items-center gap-1.5 text-gray-600 text-sm font-medium mt-4 hover:text-gray-900"
      >
        <Plus size={16} />
        Agregar otro día
      </button>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mt-4">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl mt-6 hover:bg-green-700 transition disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar rutina'}
      </button>
    </div>
  )
}