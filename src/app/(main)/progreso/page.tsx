'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Flame, Dumbbell, TrendingDown, TrendingUp } from 'lucide-react'

export default function ProgresoPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [weightData, setWeightData] = useState<{ date: string; peso: number }[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [weightChange, setWeightChange] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Historial de peso (body_metrics)
      const { data: metrics } = await supabase
        .from('body_metrics')
        .select('date, weight_kg')
        .eq('user_id', user.id)
        .order('date', { ascending: true })

      if (metrics && metrics.length > 0) {
        const formatted = metrics
          .filter((m) => m.weight_kg)
          .map((m) => ({
            date: new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            peso: Number(m.weight_kg),
          }))
        setWeightData(formatted)

        if (formatted.length >= 2) {
          setWeightChange(formatted[formatted.length - 1].peso - formatted[0].peso)
        }
      }

      // 2. Historial de entrenamientos (progress_logs)
      const { data: logs } = await supabase
        .from('progress_logs')
        .select('id, date, sets_completed, reps_completed, routine_exercises(exercises(name))')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(20)

      setHistory(logs || [])
      setTotalWorkouts(logs?.length || 0)

      // 3. Calcular racha de días consecutivos
      const { data: allDates } = await supabase
        .from('progress_logs')
        .select('date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (allDates && allDates.length > 0) {
        const uniqueDates = Array.from(new Set(allDates.map((d) => d.date))).sort().reverse()
        let currentStreak = 0
        let checkDate = new Date()

        for (const dateStr of uniqueDates) {
          const logDate = new Date(dateStr)
          const diffDays = Math.floor(
            (checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
          )
          if (diffDays <= 1) {
            currentStreak++
            checkDate = logDate
          } else {
            break
          }
        }
        setStreak(currentStreak)
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Cargando progreso...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tu progreso</h1>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-orange-500 mb-1">
            <Flame size={16} />
            <p className="text-xs text-gray-400">Racha actual</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{streak} días</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-green-600 mb-1">
            <Dumbbell size={16} />
            <p className="text-xs text-gray-400">Ejercicios completados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalWorkouts}</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 text-blue-500 mb-1">
            {weightChange !== null && weightChange < 0 ? (
              <TrendingDown size={16} />
            ) : (
              <TrendingUp size={16} />
            )}
            <p className="text-xs text-gray-400">Cambio de peso</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {weightChange !== null
              ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`
              : 'Sin datos'}
          </p>
        </div>
      </div>

      {/* Gráfica de peso */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Evolución de peso</h2>
        {weightData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Aún no tienes registros de peso. Agrégalos desde tu perfil.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['auto', 'auto']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="peso"
                stroke="#16a34a"
                strokeWidth={2.5}
                dot={{ fill: '#16a34a', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Historial de entrenamientos */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Historial reciente</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Aún no has completado ningún ejercicio. ¡Empieza tu primera rutina!
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {log.routine_exercises?.exercises?.name || 'Ejercicio'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {log.sets_completed} series · {log.reps_completed} reps
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}