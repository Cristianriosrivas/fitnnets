'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import {
  Sparkles, Loader2, Sunrise, Sun, Moon, Cookie, Pencil, Check,
  Plus, Trash2, Calculator, CheckCircle2, Circle, Droplet, TrendingUp,
} from 'lucide-react'
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip } from 'recharts'

const mealIcons: Record<string, any> = { desayuno: Sunrise, almuerzo: Sun, cena: Moon, snack: Cookie }
const mealLabels: Record<string, string> = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', cena: 'Cena', snack: 'Snack' }
const mealOrder = ['desayuno', 'almuerzo', 'cena', 'snack']

const TIPS = [
  'Mantén una buena hidratación. El agua mejora tu rendimiento y recuperación.',
  'La proteína después de entrenar ayuda a la recuperación muscular.',
  'No te saltes comidas: eso suele llevar a comer de más después.',
  'Los vegetales de hoja verde te ayudan a mantenerte saciado por más tiempo.',
]

function getWeekDays() {
  const days = []
  const dayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const todayDate = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(todayDate.getDate() - i)
    days.push({
      dateStr: d.toISOString().split('T')[0],
      label: dayLabels[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0,
    })
  }
  return days
}

const today = new Date().toISOString().split('T')[0]

export default function NutricionPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<any>(null)
  const [ingredients, setIngredients] = useState('')
  const [showIngredientsBox, setShowIngredientsBox] = useState(false)
  const [username, setUsername] = useState('')

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [estimating, setEstimating] = useState(false)

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualMeals, setManualMeals] = useState<{ meal_type: string; description: string; calories: string }[]>([
    { meal_type: 'desayuno', description: '', calories: '' },
  ])

  const weekDays = getWeekDays()

  const loadPlan = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setUsername(profile?.username || '')
    }

    const { data } = await supabase
      .from('meal_plans')
      .select('id, daily_calories, protein_g, carbs_g, fats_g, plan_date, meals(id, meal_type, description, calories, consumed)')
      .eq('plan_date', today)
      .maybeSingle()

    setPlan(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPlan()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    const res = await fetch('/api/generate-mealplan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al generar el plan')
      setGenerating(false)
      return
    }
    await loadPlan()
    setGenerating(false)
    setShowIngredientsBox(false)
  }

  const startEditMeal = (meal: any) => {
    setEditingMealId(meal.id)
    setEditDescription(meal.description)
    setEditCalories(String(meal.calories))
  }

  const handleEstimateCalories = async () => {
    if (!editDescription.trim()) return
    setEstimating(true)
    const res = await fetch('/api/estimate-calories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: editDescription }),
    })
    const data = await res.json()
    if (res.ok && data.calories) setEditCalories(String(data.calories))
    setEstimating(false)
  }

  const saveEditMeal = async () => {
    if (!editingMealId) return
    await supabase.from('meals').update({ description: editDescription, calories: parseInt(editCalories) || 0 }).eq('id', editingMealId)
    setEditingMealId(null)
    await loadPlan()
  }

  const toggleConsumed = async (meal: any) => {
    await supabase.from('meals').update({ consumed: !meal.consumed }).eq('id', meal.id)
    await loadPlan()
  }

  const addManualMealRow = () => setManualMeals((p) => [...p, { meal_type: 'snack', description: '', calories: '' }])
  const removeManualMealRow = (i: number) => setManualMeals((p) => p.filter((_, idx) => idx !== i))
  const updateManualMeal = (i: number, field: string, value: string) =>
    setManualMeals((p) => p.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)))

  const saveManualPlan = async () => {
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const validMeals = manualMeals.filter((m) => m.description.trim())
    if (validMeals.length === 0) {
      setError('Agrega al menos una comida con descripción')
      return
    }
    if (plan) {
      await supabase.from('meals').delete().eq('meal_plan_id', plan.id)
      await supabase.from('meal_plans').delete().eq('id', plan.id)
    }
    const totalCalories = validMeals.reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0)
    const { data: newPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({ user_id: user.id, plan_date: today, daily_calories: totalCalories, generated_by_ai: false })
      .select()
      .single()
    if (planError) { setError(planError.message); return }
    const mealsToInsert = validMeals.map((m) => ({
      meal_plan_id: newPlan.id, meal_type: m.meal_type, description: m.description, calories: parseInt(m.calories) || 0,
    }))
    await supabase.from('meals').insert(mealsToInsert)
    setShowManualForm(false)
    setManualMeals([{ meal_type: 'desayuno', description: '', calories: '' }])
    await loadPlan()
  }

  const consumedCalories = plan?.meals?.filter((m: any) => m.consumed).reduce((s: number, m: any) => s + m.calories, 0) || 0
  const compliancePercent = plan?.daily_calories ? Math.min(100, Math.round((consumedCalories / plan.daily_calories) * 100)) : 0
  const consumedMealsCount = plan?.meals?.filter((m: any) => m.consumed).length || 0
  const totalMealsCount = plan?.meals?.length || 0

  const macroTotal = (plan?.protein_g || 0) * 4 + (plan?.carbs_g || 0) * 4 + (plan?.fats_g || 0) * 9
  const proteinPct = macroTotal ? Math.round(((plan.protein_g * 4) / macroTotal) * 100) : 0
  const carbsPct = macroTotal ? Math.round(((plan.carbs_g * 4) / macroTotal) * 100) : 0
  const fatsPct = macroTotal ? Math.round(((plan.fats_g * 9) / macroTotal) * 100) : 0

  const tipOfDay = TIPS[new Date().getDate() % TIPS.length]

  if (loading) {
    return <div className="p-8 text-center text-[#6b7876]">Cargando...</div>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">¡Hola, {username || 'atleta'}! 🔥</h1>
          <p className="text-sm text-[#9ca8a5] mt-0.5">Tu alimentación es el combustible para tus metas.</p>
        </div>
        <p className="text-xs text-[#6b7876] hidden sm:block capitalize">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Columna principal */}
        <div>
          {/* Cumplimiento + macros */}
          <div className="card-dark p-5 mb-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#1f2926" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - compliancePercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-white">{compliancePercent}%</span>
                  <span className="text-[9px] text-[#9ca8a5] text-center leading-tight">Cumplimiento<br />diario</span>
                </div>
              </div>

              <div className="flex-1 w-full">
                <p className="text-2xl font-bold text-white mb-3">
                  {consumedCalories} <span className="text-sm font-medium text-[#6b7876]">/ {plan?.daily_calories || 0} kcal</span>
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-red-400 font-medium">Proteínas</p>
                    <p className="text-sm font-bold text-red-300">{plan?.protein_g || 0}g</p>
                    <p className="text-[9px] text-red-400/70">({proteinPct}%)</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-amber-400 font-medium">Carbohidratos</p>
                    <p className="text-sm font-bold text-amber-300">{plan?.carbs_g || 0}g</p>
                    <p className="text-[9px] text-amber-400/70">({carbsPct}%)</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-blue-400 font-medium">Grasas</p>
                    <p className="text-sm font-bold text-blue-300">{plan?.fats_g || 0}g</p>
                    <p className="text-[9px] text-blue-400/70">({fatsPct}%)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <button
              onClick={() => setShowIngredientsBox((v) => !v)}
              disabled={generating}
              className="btn-primary flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl flex-1 disabled:opacity-50"
            >
              <Sparkles size={16} />
              {plan?.meals?.length ? 'Regenerar con IA' : 'Generar plan con IA'}
            </button>
            <button
              onClick={() => setShowManualForm((v) => !v)}
              className="btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl flex-1"
            >
              <Plus size={16} />
              Crear mi propio plan
            </button>
          </div>

          {showIngredientsBox && (
            <div className="card-dark p-4 mb-5">
              <label className="block text-sm font-medium text-white mb-1">¿Qué alimentos tienes disponibles hoy?</label>
              <p className="text-xs text-[#6b7876] mb-2">Ej: pollo, arroz, huevos, avena, plátano, atún...</p>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={2}
                className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                placeholder="Escribe los alimentos que tienes, separados por comas"
              />
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-primary mt-3 w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? <><Loader2 size={16} className="animate-spin" /> Generando...</> : 'Generar mi plan de hoy'}
              </button>
            </div>
          )}

          {showManualForm && (
            <div className="card-dark p-4 mb-5">
              <p className="text-sm font-semibold text-white mb-3">Arma tu plan de hoy</p>
              <div className="space-y-3">
                {manualMeals.map((m, index) => (
                  <div key={index} className="flex flex-wrap gap-2 items-center bg-[#141b19] p-2 rounded-lg">
                    <select
                      value={m.meal_type}
                      onChange={(e) => updateManualMeal(index, 'meal_type', e.target.value)}
                      className="input-dark px-2 py-1.5 rounded-lg text-sm"
                    >
                      {mealOrder.map((t) => <option key={t} value={t}>{mealLabels[t]}</option>)}
                    </select>
                    <input
                      type="text" value={m.description}
                      onChange={(e) => updateManualMeal(index, 'description', e.target.value)}
                      placeholder="Descripción de la comida"
                      className="input-dark flex-1 min-w-[140px] px-2 py-1.5 rounded-lg text-sm"
                    />
                    <input
                      type="number" value={m.calories}
                      onChange={(e) => updateManualMeal(index, 'calories', e.target.value)}
                      placeholder="Kcal"
                      className="input-dark w-20 px-2 py-1.5 rounded-lg text-sm"
                    />
                    {manualMeals.length > 1 && (
                      <button onClick={() => removeManualMealRow(index)} className="text-[#6b7876] hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addManualMealRow} className="flex items-center gap-1.5 text-green-500 text-sm font-medium mt-3 hover:underline">
                <Plus size={14} /> Agregar otra comida
              </button>
              <button onClick={saveManualPlan} className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm">
                Guardar mi plan de hoy
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4">{error}</p>}

          {/* Selector de días de la semana */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Tu plan de alimentación</p>
            <p className="text-xs text-[#6b7876]">{consumedMealsCount}/{totalMealsCount} completadas</p>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {weekDays.map((d) => (
              <div
                key={d.dateStr}
                className={`flex flex-col items-center justify-center w-11 h-14 rounded-xl flex-shrink-0 text-xs font-medium ${
                  d.isToday ? 'bg-green-500 text-[#052e14]' : 'bg-[#141b19] text-[#6b7876] border border-[#2a3532]'
                }`}
              >
                <span>{d.label}</span>
                <span className="text-sm font-bold">{d.dayNum}</span>
              </div>
            ))}
          </div>

          {/* Lista de comidas */}
          {!plan ? (
            <div className="text-center py-16 card-dark">
              <p className="text-[#9ca8a5]">Aún no tienes un plan para hoy.</p>
              <p className="text-sm text-[#6b7876] mt-1">Genera uno con IA o créalo tú mismo 👆</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mealOrder.map((type) => {
                const meal = plan.meals?.find((m: any) => m.meal_type === type)
                if (!meal) return null
                const Icon = mealIcons[type]
                const isEditing = editingMealId === meal.id

                return (
                  <div
                    key={meal.id}
                    className={`card-dark p-4 flex items-start gap-3 ${meal.consumed ? 'border-green-500/40' : ''}`}
                  >
                    <button onClick={() => toggleConsumed(meal)} className="flex-shrink-0 mt-0.5">
                      {meal.consumed ? <CheckCircle2 className="text-green-500" size={22} /> : <Circle className="text-[#2a3532]" size={22} />}
                    </button>

                    <div className="bg-green-500/10 text-green-500 rounded-lg p-2 flex-shrink-0">
                      <Icon size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold text-sm ${meal.consumed ? 'text-[#6b7876]' : 'text-white'}`}>{mealLabels[type]}</p>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" value={editCalories}
                              onChange={(e) => setEditCalories(e.target.value)}
                              className="input-dark w-16 px-1.5 py-0.5 rounded text-xs text-right"
                            />
                            <button onClick={handleEstimateCalories} disabled={estimating} className="text-[#6b7876] hover:text-green-500 disabled:opacity-50">
                              {estimating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-[#6b7876]">{meal.calories} kcal</p>
                        )}
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="input-dark w-full mt-1 px-2 py-1.5 rounded-lg text-sm"
                        />
                      ) : (
                        <p className={`text-sm mt-1 ${meal.consumed ? 'text-[#6b7876] line-through' : 'text-[#9ca8a5]'}`}>{meal.description}</p>
                      )}
                    </div>

                    <button onClick={() => (isEditing ? saveEditMeal() : startEditMeal(meal))} className="text-[#6b7876] hover:text-green-500 flex-shrink-0">
                      {isEditing ? <Check size={18} /> : <Pencil size={16} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-5">
          <div className="card-dark p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-green-500" />
              Tu progreso nutricional
            </p>
            {weightSample.length === 0 ? null : null}
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={[{ v: compliancePercent * 0.7 }, { v: compliancePercent * 0.85 }, { v: compliancePercent }]}>
                <defs>
                  <linearGradient id="nutriGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{ background: '#141b19', border: '1px solid #2a3532', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="v" stroke="#22c55e" strokeWidth={2} fill="url(#nutriGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-[#6b7876] text-center mt-1">Tendencia de cumplimiento reciente</p>
          </div>

          <div className="card-dark p-4">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
              <Sparkles size={15} className="text-blue-400" />
              Consejo de tu IA
            </p>
            <div className="flex items-start gap-2.5">
              <div className="bg-blue-500/15 text-blue-400 p-2 rounded-lg flex-shrink-0">
                <Droplet size={16} />
              </div>
              <p className="text-xs text-[#9ca8a5] leading-relaxed">{tipOfDay}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const weightSample: any[] = []