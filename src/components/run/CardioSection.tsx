'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Footprints, Trophy, Timer, Route as RouteIcon, Minus, Plus } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { formatDuration } from '@/core/training'
import { LatLng, RunRecord, formatKm, formatPace, loadRouteLocally, loadRuns, personalRecords, weeklyKm } from '@/core/running'
import { DaySteps, loadStepGoal, loadStepHistory, saveStepGoal } from '@/core/steps'
import RouteView from './RouteView'
import IconBadge from '../ui/IconBadge'
import CountUp from '../ui/CountUp'
import Skeleton from '../ui/Skeleton'
import { colors, glow, gradientCss, gradients } from '../ui/theme'

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function RecordTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1c2523] rounded-2xl p-3">
      <p className="text-[#6b7876] text-[11px]">{label}</p>
      <p className="text-white text-lg font-extrabold mt-0.5 tabular-nums">{value}</p>
    </div>
  )
}

// Pestaña Cardio de Progreso: semana, km por semana, récords, pasos y carreras recientes
export default function CardioSection() {
  const [runs, setRuns] = useState<RunRecord[] | null>(null)
  const [steps, setSteps] = useState<DaySteps[]>([])
  const [goal, setGoal] = useState(8000)
  const [routes, setRoutes] = useState<Record<string, LatLng[]>>({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const [list, history, stepGoal] = await Promise.all([loadRuns(user.id), loadStepHistory(user.id, 7), loadStepGoal()])
      setRuns(list)
      setSteps(history)
      setGoal(stepGoal)
      const recent = list.slice(0, 8)
      const loaded = await Promise.all(recent.map(async (r) => [r.id, await loadRouteLocally(r.id)] as const))
      setRoutes(Object.fromEntries(loaded.filter(([, route]) => route && route.length > 1)) as Record<string, LatLng[]>)
    } catch {
      setError('No pudimos cargar tu cardio. Revisa tu conexión.')
      setRuns([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeGoal = (delta: number) => {
    const next = Math.max(2000, Math.min(30000, goal + delta))
    setGoal(next)
    saveStepGoal(next)
  }

  if (runs === null) return <Skeleton height={300} radius={24} />

  if (error) {
    return (
      <div className="card-dark rounded-3xl p-6 text-center">
        <p className="text-[#9ca8a5]">{error}</p>
        <button type="button" onClick={load} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Reintentar</button>
      </div>
    )
  }

  const weeks = weeklyKm(runs)
  const thisWeek = weeks[weeks.length - 1]
  const weekRuns = runs.filter((r) => new Date(r.started_at).getTime() >= thisWeek.start)
  const weekSeconds = weekRuns.reduce((s, r) => s + r.duration_seconds, 0)
  const maxWeek = Math.max(...weeks.map((w) => w.km), 1)
  const records = personalRecords(runs)
  const maxSteps = Math.max(goal, ...steps.map((d) => d.steps))
  const avgSteps = steps.length ? Math.round(steps.reduce((s, d) => s + d.steps, 0) / steps.length) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Acceso a la carrera */}
      <Link href="/correr" aria-label="Salir a correr" className="press lg:col-span-2 rounded-3xl p-4 flex items-center gap-3" style={{ background: gradientCss(gradients.run), ...glow('#f97316', 16, 0.35) }}>
        <Zap color="#ffffff" size={22} fill="#ffffff" />
        <span className="flex-1">
          <span className="block text-white font-extrabold">Salir a correr</span>
          <span className="block text-white/80 text-xs">GPS, ritmo y récords</span>
        </span>
      </Link>

      {/* Semana */}
      <div className="card-dark rounded-3xl p-5">
        <p className="text-white font-bold mb-3">Esta semana</p>
        <div className="flex justify-between mb-5">
          <div>
            <p>
              <CountUp value={thisWeek.km} decimals={1} className="text-white text-3xl font-extrabold" />
              <span className="text-[#9ca8a5] text-xs ml-1">km</span>
            </p>
            <p className="text-[#6b7876] text-[11px]">distancia</p>
          </div>
          <div>
            <p className="text-white text-3xl font-extrabold">{weekRuns.length}</p>
            <p className="text-[#6b7876] text-[11px]">{weekRuns.length === 1 ? 'salida' : 'salidas'}</p>
          </div>
          <div>
            <p className="text-white text-3xl font-extrabold tabular-nums">{formatDuration(weekSeconds)}</p>
            <p className="text-[#6b7876] text-[11px]">tiempo</p>
          </div>
        </div>
        {/* Km por semana */}
        <div className="flex items-end justify-between h-[90px]">
          {weeks.map((w, i) => {
            const current = i === weeks.length - 1
            return (
              <div key={w.start} className="flex flex-col items-center flex-1">
                <div className="flex flex-col justify-end w-full h-[70px] px-[5px]">
                  <div
                    className="rounded-md"
                    style={{
                      height: Math.max(4, (w.km / maxWeek) * 70),
                      background: w.km ? gradientCss(current ? ['#fdba74', '#f97316'] : ['#22c55e', '#15803d'], 'vertical') : '#1f2926',
                    }}
                  />
                </div>
                <span className="text-[9px] mt-1" style={{ color: current ? colors.orange : colors.muted, fontWeight: current ? 800 : 500 }}>
                  {new Date(w.start).toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[#6b7876] text-[11px] mt-2">Km por semana (lunes a domingo)</p>
      </div>

      {/* Récords */}
      <div className="card-dark rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy color={colors.gold} size={18} />
          <p className="text-white font-bold">Tus récords corriendo</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <RecordTile label="Mejor kilómetro" value={records.best1k ? formatPace(records.best1k) : '—'} />
          <RecordTile label="Mejor 5K" value={records.best5k ? formatDuration(records.best5k) : '—'} />
          <RecordTile label="Mejor 10K" value={records.best10k ? formatDuration(records.best10k) : '—'} />
          <RecordTile label="Más larga" value={records.longest ? formatKm(records.longest, 1) + ' km' : '—'} />
        </div>
      </div>

      {/* Pasos: los cuenta la app móvil; la web muestra lo que ya llegó */}
      {steps.length ? (
        <div className="card-dark rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Footprints color={colors.sky} size={18} />
              <p className="text-white font-bold">Pasos</p>
            </div>
            <p className="text-[#9ca8a5] text-xs">{'Promedio ' + avgSteps.toLocaleString('es-CO')}</p>
          </div>
          <div className="flex items-end justify-between h-[90px]">
            {steps.map((d) => (
              <div key={d.date} className="flex flex-col items-center flex-1">
                <div className="flex flex-col justify-end w-full h-[70px] px-1.5">
                  <div className="rounded-md" style={{ height: Math.max(4, (d.steps / maxSteps) * 70), background: gradientCss(d.steps >= goal ? gradients.brand : gradients.ocean, 'vertical') }} />
                </div>
                <span className="text-[10px] mt-1 text-[#6b7876]">{DAY_LETTERS[new Date(d.date + 'T12:00:00').getDay()]}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2a3532]">
            <p className="text-[#9ca8a5] text-xs">Meta diaria</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => changeGoal(-1000)} aria-label="Bajar la meta de pasos" className="press w-8 h-8 rounded-full bg-[#1c2523] flex items-center justify-center">
                <Minus color={colors.soft} size={14} />
              </button>
              <span className="text-white font-bold">{goal.toLocaleString('es-CO')}</span>
              <button type="button" onClick={() => changeGoal(1000)} aria-label="Subir la meta de pasos" className="press w-8 h-8 rounded-full bg-[#1c2523] flex items-center justify-center">
                <Plus color={colors.soft} size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recientes */}
      <div className={`card-dark rounded-3xl p-5 ${steps.length ? '' : 'lg:col-span-2'}`}>
        <p className="text-white font-bold mb-3">Últimas salidas</p>
        {runs.length === 0 ? (
          <div className="flex flex-col items-center py-4">
            <IconBadge colors={gradients.ember} size={52} radius={16}>
              <RouteIcon color="#ffffff" size={24} />
            </IconBadge>
            <p className="text-[#9ca8a5] text-sm text-center mt-3">Tu primera carrera aparecerá aquí.</p>
          </div>
        ) : (
          runs.slice(0, 8).map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 py-2.5 ${i < Math.min(runs.length, 8) - 1 ? 'border-b border-[#2a3532]' : ''}`}>
              <div className="rounded-xl overflow-hidden bg-[#1c2523] flex-shrink-0 flex items-center justify-center" style={{ width: 64, height: 48 }}>
                {routes[r.id] ? (
                  <RouteView route={routes[r.id]} width={64} height={48} pad={6} />
                ) : r.activity === 'correr' ? (
                  <Zap color={colors.muted} size={18} />
                ) : (
                  <Footprints color={colors.muted} size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">{formatKm(r.distance_m) + ' km · ' + (r.activity === 'correr' ? 'Carrera' : 'Caminata')}</p>
                <p className="text-[#6b7876] text-xs mt-0.5">
                  {new Date(r.started_at).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + formatPace(r.avg_pace_seconds) + ' /km'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Timer color={colors.muted} size={12} />
                <span className="text-[#9ca8a5] text-xs tabular-nums">{formatDuration(r.duration_seconds)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
