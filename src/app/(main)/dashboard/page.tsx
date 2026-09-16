import { createClient } from '@/core/supabase/server'
import Link from 'next/link'
import { Weight, Ruler, Dumbbell, Flame, Play, Droplet } from 'lucide-react'

const TIPS = [
  'Mantén una buena hidratación. El agua mejora tu rendimiento y recuperación.',
  'La constancia es más importante que la intensidad. Entrena con calidad, no solo con prisa.',
  'Duerme al menos 7 horas: es cuando tu cuerpo realmente construye músculo.',
  'El calentamiento previene lesiones y mejora tu rendimiento en cada serie.',
  'La proteína después de entrenar ayuda a la recuperación muscular.',
  'Progresar poco a poco es mejor que forzar demasiado y lesionarte.',
  'Escucha a tu cuerpo: el descanso también es parte del entrenamiento.',
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, weight_kg, height_cm')
    .eq('id', user!.id)
    .single()

  const { data: latestMetric } = await supabase
    .from('body_metrics')
    .select('bicep_cm')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Racha de días consecutivos
  const { data: allDates } = await supabase
    .from('progress_logs')
    .select('date')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  let streak = 0
  const uniqueDates = Array.from(new Set((allDates || []).map((d) => d.date))).sort().reverse()
  let checkDate = new Date()
  for (const dateStr of uniqueDates) {
    const logDate = new Date(dateStr)
    const diffDays = Math.floor((checkDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1) {
      streak++
      checkDate = logDate
    } else break
  }

  // Últimos 7 días: qué días entrenó
  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const last7: { label: string; trained: boolean }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    last7.push({ label: dayLabels[d.getDay()], trained: uniqueDates.includes(dateStr) })
  }
  const weekPercent = Math.round((last7.filter((d) => d.trained).length / 7) * 100)

  // Rutina más reciente (para "tu plan de hoy")
  const { data: latestRoutine } = await supabase
    .from('routines')
    .select('id, title, routine_days(id, day_number, title, routine_exercises(id))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const firstDay = latestRoutine?.routine_days?.sort((a: any, b: any) => a.day_number - b.day_number)[0]
  const exerciseCount = firstDay?.routine_exercises?.length || 0

  const tipOfDay = TIPS[new Date().getDate() % TIPS.length]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            ¡Hola, {profile?.username || 'atleta'}! 👋
          </h1>
          <p className="text-[#9ca8a5] mt-1 text-sm">Tu progreso es el resultado de tus hábitos.</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center font-bold flex-shrink-0">
          {profile?.username?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Fila de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-dark p-4">
          <div className="flex items-center gap-1.5 text-green-500 mb-1">
            <Weight size={14} />
            <p className="text-xs text-[#9ca8a5]">Peso actual</p>
          </div>
          <p className="text-xl font-bold text-white">{profile?.weight_kg || '--'} kg</p>
        </div>
        <div className="card-dark p-4">
          <div className="flex items-center gap-1.5 text-green-500 mb-1">
            <Ruler size={14} />
            <p className="text-xs text-[#9ca8a5]">Altura</p>
          </div>
          <p className="text-xl font-bold text-white">{profile?.height_cm || '--'} m</p>
        </div>
        <div className="card-dark p-4">
          <div className="flex items-center gap-1.5 text-green-500 mb-1">
            <Dumbbell size={14} />
            <p className="text-xs text-[#9ca8a5]">Brazo</p>
          </div>
          <p className="text-xl font-bold text-white">{latestMetric?.bicep_cm || '--'} cm</p>
        </div>
        <div className="card-dark p-4">
          <div className="flex items-center gap-1.5 text-orange-400 mb-1">
            <Flame size={14} />
            <p className="text-xs text-[#9ca8a5]">Racha actual</p>
          </div>
          <p className="text-xl font-bold text-white">{streak} día{streak !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Tu rutina de hoy */}
      <div className="card-dark p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#9ca8a5] mb-1">Tu rutina de hoy</p>
          {latestRoutine ? (
            <>
              <p className="text-white font-semibold">
                {firstDay?.title || latestRoutine.title}
              </p>
              <p className="text-xs text-[#9ca8a5] mt-1">{exerciseCount} ejercicios</p>
            </>
          ) : (
            <p className="text-white font-semibold">Aún no tienes una rutina</p>
          )}
        </div>
        {latestRoutine ? (
          <Link
            href={`/rutinas/${latestRoutine.id}/entrenar`}
            className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm flex-shrink-0"
          >
            <Play size={16} />
            Iniciar rutina
          </Link>
        ) : (
          <Link
            href="/rutinas"
            className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm flex-shrink-0"
          >
            Crear rutina
          </Link>
        )}
      </div>

      {/* Progreso semanal + Consejo del día */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-dark p-5">
          <p className="text-sm font-semibold text-white mb-4">Progreso semanal</p>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2926" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - weekPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{weekPercent}%</span>
                <span className="text-[9px] text-[#9ca8a5]">Completado</span>
              </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-1.5 h-20">
              {last7.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className={`w-full rounded-full ${d.trained ? 'bg-green-500' : 'bg-[#1f2926]'}`}
                    style={{ height: d.trained ? '100%' : '20%' }}
                  />
                  <span className="text-[10px] text-[#6b7876]">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-dark p-5">
          <p className="text-sm font-semibold text-white mb-3">Consejo del día</p>
          <div className="flex items-start gap-3">
            <div className="bg-blue-500/15 text-blue-400 p-2 rounded-lg flex-shrink-0">
              <Droplet size={18} />
            </div>
            <p className="text-sm text-[#9ca8a5] leading-relaxed">{tipOfDay}</p>
          </div>
        </div>
      </div>
    </div>
  )
}