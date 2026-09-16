'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Weight, Percent, Dumbbell, TrendingUp, TrendingDown, ArrowUp,
  Flame, Clock, Activity, Plus, Target, Loader2,
} from 'lucide-react'

const TABS = ['Progreso', 'Métricas', 'Metas']
const GOAL_OPTIONS = [
  { value: 'perder_grasa', label: '🔥 Perder grasa' },
  { value: 'ganar_musculo', label: '💪 Ganar músculo' },
  { value: 'mantenimiento', label: '⚖️ Mantenimiento' },
  { value: 'resistencia', label: '🏃 Mejorar resistencia' },
]

export default function ProgresoPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('Progreso')
  const [loading, setLoading] = useState(true)

  const [profileWeight, setProfileWeight] = useState<number | null>(null)
  const [weightData, setWeightData] = useState<{ date: string; peso: number }[]>([])
  const [weightChange, setWeightChange] = useState<number | null>(null)
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [weekTrainedDays, setWeekTrainedDays] = useState(0)

  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  const [goal, setGoal] = useState('')
  const [customGoalNotes, setCustomGoalNotes] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('weight_kg, goal, custom_goal_notes')
      .eq('id', user.id)
      .single()

    setProfileWeight(profile?.weight_kg || null)
    setGoal(profile?.goal || '')
    setCustomGoalNotes(profile?.custom_goal_notes || '')

    const { data: metrics } = await supabase
      .from('body_metrics')
      .select('date, weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    const withWeight = (metrics || []).filter((m) => m.weight_kg)
    const formatted = withWeight.map((m) => ({
      date: new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      peso: Number(m.weight_kg),
    }))
    setWeightData(formatted)
    if (formatted.length >= 2) {
      setWeightChange(formatted[formatted.length - 1].peso - formatted[0].peso)
    } else {
      setWeightChange(null)
    }

    const { data: logs } = await supabase.from('progress_logs').select('date').eq('user_id', user.id)
    setTotalWorkouts(logs?.length || 0)

    const uniqueDates = new Set((logs || []).map((l) => l.date))
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (uniqueDates.has(d.toISOString().split('T')[0])) count++
    }
    setWeekTrainedDays(count)

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveWeight = async () => {
    const value = parseFloat(newWeight)
    if (!value || value <= 0) return
    setSavingWeight(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toISOString().split('T')[0]

    const { data: existing } = await supabase
      .from('body_metrics')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (existing) {
      await supabase.from('body_metrics').update({ weight_kg: value }).eq('id', existing.id)
    } else {
      await supabase.from('body_metrics').insert({ user_id: user.id, date: today, weight_kg: value })
    }

    // Mantener sincronizado el peso "actual" del perfil (usado en dashboard y onboarding)
    await supabase.from('profiles').update({ weight_kg: value }).eq('id', user.id)

    setNewWeight('')
    setShowWeightModal(false)
    setSavingWeight(false)
    await loadData()
  }

  const handleSaveGoal = async () => {
    setSavingGoal(true)
    setGoalSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ goal, custom_goal_notes: customGoalNotes || null })
      .eq('id', user.id)

    setSavingGoal(false)
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 2500)
  }

  const weekPercent = Math.round((weekTrainedDays / 7) * 100)
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].peso : profileWeight
  const estimatedMinutes = totalWorkouts * 15
  const estimatedCalories = totalWorkouts * 35

  if (loading) {
    return <div className="p-8 text-center text-[#6b7876]">Cargando progreso...</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tu Progreso</h1>
          <p className="text-sm text-[#9ca8a5] mt-0.5">Los resultados se construyen con información.</p>
        </div>
        {activeTab === 'Progreso' && (
          <button
            onClick={() => setShowWeightModal(true)}
            className="btn-primary flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl w-fit"
          >
            <Plus size={16} />
            Registrar peso de hoy
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === tab ? 'bg-green-500 text-[#052e14]' : 'bg-[#141b19] text-[#9ca8a5] border border-[#2a3532]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Modal simple para registrar peso */}
      {showWeightModal && (
        <div className="card-dark p-4 mb-6">
          <p className="text-sm font-semibold text-white mb-2">¿Cuánto pesas hoy?</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="ej: 74.5"
              className="input-dark flex-1 px-3 py-2 rounded-lg text-sm"
              autoFocus
            />
            <button
              onClick={handleSaveWeight}
              disabled={savingWeight}
              className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {savingWeight ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
            </button>
            <button
              onClick={() => setShowWeightModal(false)}
              className="btn-secondary px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-[#6b7876] mt-2">
            Esto actualiza tu peso actual y se refleja en la gráfica de evolución.
          </p>
        </div>
      )}

      {activeTab === 'Progreso' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card-dark p-4">
              <div className="flex items-center gap-1.5 text-green-500 mb-2">
                <Weight size={14} />
                <p className="text-xs text-[#9ca8a5]">Peso</p>
              </div>
              <p className="text-xl font-bold text-white">{currentWeight ?? '--'} kg</p>
              {weightChange !== null && (
                <p className={`text-xs flex items-center gap-1 mt-1 ${weightChange < 0 ? 'text-green-500' : 'text-orange-400'}`}>
                  {weightChange < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                </p>
              )}
            </div>

            <div className="card-dark p-4">
              <div className="flex items-center gap-1.5 text-blue-400 mb-2">
                <Percent size={14} />
                <p className="text-xs text-[#9ca8a5]">% Grasa corporal</p>
              </div>
              <p className="text-xl font-bold text-white">--</p>
              <p className="text-xs text-[#6b7876] mt-1">Sin datos aún</p>
            </div>

            <div className="card-dark p-4">
              <div className="flex items-center gap-1.5 text-purple-400 mb-2">
                <Dumbbell size={14} />
                <p className="text-xs text-[#9ca8a5]">Masa muscular</p>
              </div>
              <p className="text-xl font-bold text-white">--</p>
              <p className="text-xs text-[#6b7876] mt-1">Sin datos aún</p>
            </div>

            <div className="card-dark p-4">
              <div className="flex items-center gap-1.5 text-green-500 mb-2">
                <Activity size={14} />
                <p className="text-xs text-[#9ca8a5]">Fuerza</p>
              </div>
              <p className="text-xl font-bold text-white">
                {totalWorkouts > 0 ? `+${Math.min(totalWorkouts * 2, 40)}%` : '--'}
              </p>
              {totalWorkouts > 0 && (
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <ArrowUp size={12} /> Basado en tu actividad
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4">
            <div className="card-dark p-5">
              <p className="text-sm font-semibold text-white mb-4">Evolución de peso</p>
              {weightData.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                  <p className="text-sm text-[#6b7876] text-center">
                    Aún no tienes registros históricos de peso.
                  </p>
                  <button
                    onClick={() => setShowWeightModal(true)}
                    className="text-xs text-green-500 hover:underline"
                  >
                    Registra tu peso de hoy para empezar tu gráfica
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weightData}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2926" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7876' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7876' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#141b19', border: '1px solid #2a3532', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#9ca8a5' }} />
                    <Area type="monotone" dataKey="peso" stroke="#22c55e" strokeWidth={2.5} fill="url(#weightGradient)" dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card-dark p-5">
              <p className="text-sm font-semibold text-white mb-4">Progreso semanal</p>
              <div className="flex items-center gap-5">
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2926" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - weekPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">{weekPercent}%</span>
                    <span className="text-[9px] text-[#9ca8a5]">Esta semana</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-[#9ca8a5]"><Dumbbell size={13} /> Días esta semana</span>
                    <span className="text-white font-semibold">{weekTrainedDays}/7</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-[#9ca8a5]"><Clock size={13} /> Tiempo total (histórico)</span>
                    <span className="text-white font-semibold">{Math.floor(estimatedMinutes / 60)}h {estimatedMinutes % 60}m</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-[#9ca8a5]"><Flame size={13} /> Calorías aprox. (histórico)</span>
                    <span className="text-white font-semibold">{estimatedCalories.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Métricas' && (
        <div className="text-center py-16 card-dark">
          <p className="text-[#9ca8a5]">Próximamente: % grasa corporal, masa muscular y más métricas detalladas 🚧</p>
        </div>
      )}

      {activeTab === 'Metas' && (
        <div className="card-dark p-5 max-w-xl">
          <div className="flex items-center gap-2 mb-4">
            <Target className="text-green-500" size={18} />
            <p className="text-sm font-semibold text-white">Define tu meta</p>
          </div>

          <label className="block text-sm text-[#9ca8a5] mb-1.5">Categoría principal</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="input-dark w-full px-3 py-2 rounded-lg text-sm mb-4"
          >
            <option value="">Selecciona una meta</option>
            {GOAL_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>

          <label className="block text-sm text-[#9ca8a5] mb-1.5">
            Cuéntanos con tus palabras qué quieres lograr
          </label>
          <textarea
            value={customGoalNotes}
            onChange={(e) => setCustomGoalNotes(e.target.value)}
            rows={4}
            placeholder="Ej: quiero bajar de peso sobre todo en el abdomen, tengo una boda en 3 meses y quiero verme y sentirme mejor..."
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
          />
          <p className="text-xs text-[#6b7876] mt-2">
            Esta nota se usará automáticamente la próxima vez que generes una rutina o un plan de nutrición con IA.
          </p>

          <button
            onClick={handleSaveGoal}
            disabled={savingGoal || !goal}
            className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {savingGoal ? 'Guardando...' : goalSaved ? '✓ Guardado' : 'Guardar mi meta'}
          </button>
        </div>
      )}
    </div>
  )
}