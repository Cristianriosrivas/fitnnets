'use client'

import { useCallback, useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Dumbbell } from 'lucide-react'
import { supabase } from '@/core/supabase/browser'
import { loadStrengthSeries, StrengthSeries } from '@/core/training'
import { formatKg, strengthLevel } from '@/core/gym'
import CountUp from '@/components/ui/CountUp'
import IconBadge from '@/components/ui/IconBadge'
import Skeleton from '@/components/ui/Skeleton'
import { gradientCss, gradients } from '@/components/ui/theme'

// Evolución del peso levantado por ejercicio (datos de progress_logs.weight_used_kg)
export default function StrengthSection() {
  const [series, setSeries] = useState<StrengthSeries[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState<{ weightKg: number | null; gender: string | null }>({ weightKg: null, gender: null })

  const load = useCallback(async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      const [data, { data: p }] = await Promise.all([
        loadStrengthSeries(user.id),
        supabase.from('profiles').select('weight_kg, gender').eq('id', user.id).single(),
      ])
      setBody({ weightKg: p?.weight_kg ? Number(p.weight_kg) : null, gender: p?.gender ?? null })
      setSeries(data)
      setSelectedId((current) => current ?? data[0]?.exerciseId ?? null)
    } catch {
      setError('No pudimos cargar tu fuerza por ejercicio.')
      setSeries([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (series === null) return <Skeleton height={280} radius={24} />

  if (error) {
    return (
      <div className="card-dark rounded-3xl p-6 text-center">
        <p className="text-[#9ca8a5]">{error}</p>
        <button type="button" onClick={load} className="btn-primary rounded-xl px-5 py-2.5 mt-4">Reintentar</button>
      </div>
    )
  }

  if (series.length === 0) {
    return (
      <div className="card-dark rounded-3xl p-8 flex flex-col items-center text-center">
        <IconBadge colors={gradients.violet} size={56} radius={18}>
          <Dumbbell color="#ffffff" size={26} />
        </IconBadge>
        <p className="text-white font-bold mt-4">Tu fuerza, ejercicio por ejercicio</p>
        <p className="text-[#9ca8a5] text-sm mt-1">Anota el peso cuando entrenes y aquí verás cómo sube cada ejercicio.</p>
      </div>
    )
  }

  const selected = series.find((s) => s.exerciseId === selectedId) || series[0]
  const weights = selected.points.map((p) => p.weight)
  const best = Math.max(...weights)
  const gain = Math.round((weights[weights.length - 1] - weights[0]) * 100) / 100
  const bestOneRm = Math.max(...selected.points.map((p) => p.oneRm))
  const level = strengthLevel(selected.name, bestOneRm, body.weightKg, body.gender)
  const chartData = selected.points.map((p) => ({
    date: new Date(p.date + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    peso: p.weight,
  }))

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3.5">
        {series.map((s) => {
          const active = s.exerciseId === selected.exerciseId
          return (
            <button
              key={s.exerciseId}
              type="button"
              onClick={() => setSelectedId(s.exerciseId)}
              className={`px-3.5 py-2 rounded-full border text-xs whitespace-nowrap ${active ? 'bg-green-500 border-green-500 text-black font-bold' : 'bg-[#141b19] border-[#2a3532] text-[#c9d1cf]'}`}
            >
              {s.name}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-dark rounded-3xl p-4">
              <p className="text-[#9ca8a5] text-xs">Mejor marca</p>
              <p className="mt-1">
                <CountUp value={best} decimals={Number.isInteger(best) ? 0 : 1} className="text-white text-2xl font-extrabold" />
                <span className="text-[#9ca8a5] text-xs ml-1">kg</span>
              </p>
            </div>
            <div className="card-dark rounded-3xl p-4">
              <p className="text-[#9ca8a5] text-xs">Desde tu primera sesión</p>
              <p className={`text-2xl font-extrabold mt-1 ${gain > 0 ? 'text-green-500' : 'text-white'}`}>{(gain > 0 ? '+' : '') + gain + ' kg'}</p>
            </div>
          </div>

          {/* 1RM estimado y nivel de fuerza relativo al peso corporal */}
          <div className="rounded-3xl p-4" style={{ background: gradientCss(['#1e1b4b', '#141b19'], 'horizontal'), border: '1px solid rgba(167,139,250,0.35)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-violet-300 text-xs font-semibold">1RM estimado</p>
                <p className="mt-0.5">
                  <CountUp value={bestOneRm} decimals={Number.isInteger(bestOneRm) ? 0 : 1} className="text-white text-3xl font-extrabold" />
                  <span className="text-[#9ca8a5] text-xs ml-1">kg</span>
                </p>
                <p className="text-[#6b7876] text-[11px]">El máximo que podrías levantar 1 vez</p>
              </div>
              {level ? (
                <div className="flex flex-col items-end">
                  <span className="bg-violet-500/20 border border-violet-400/40 rounded-full px-3 py-1 text-violet-200 text-xs font-extrabold">{level.level}</span>
                  <p className="text-[#9ca8a5] text-[11px] mt-1.5">{formatKg(level.ratio) + '× tu peso corporal'}</p>
                </div>
              ) : null}
            </div>
            {level?.next ? (
              <p className="text-[#9ca8a5] text-xs mt-3">
                {'Para nivel ' + level.next.level + ' necesitas un 1RM de ' + formatKg(level.next.kg) + ' kg (te faltan ' + formatKg(Math.max(0, level.next.kg - bestOneRm)) + ' kg).'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="card-dark rounded-3xl p-5">
          <p className="text-white font-semibold text-sm mb-3">{selected.name}</p>
          {selected.points.length < 2 ? (
            <p className="text-[#6b7876] text-sm text-center py-8">Entrena este ejercicio al menos 2 días para ver tu evolución.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="strengthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2926" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7876' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7876' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} unit=" kg" width={52} />
                <Tooltip contentStyle={{ background: '#141b19', border: '1px solid #2a3532', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca8a5' }} />
                <Area type="monotone" dataKey="peso" stroke="#a78bfa" strokeWidth={2.5} fill="url(#strengthGradient)" dot={{ fill: '#a78bfa', r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <p className="text-[#6b7876] text-xs mt-2">{selected.points.length + (selected.points.length === 1 ? ' sesión registrada' : ' sesiones registradas')}</p>
        </div>
      </div>
    </div>
  )
}
