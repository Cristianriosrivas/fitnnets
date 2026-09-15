'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/core/supabase/client'
import { Sparkles, Loader2, Sunrise, Sun, Moon, Cookie, Pencil, Check, Plus, Trash2, Calculator, CheckCircle2, Circle } from 'lucide-react'

const mealIcons: Record<string, any> = {
  desayuno: Sunrise,
  almuerzo: Sun,
  cena: Moon,
  snack: Cookie,
}

const mealLabels: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
}

const mealOrder = ['desayuno', 'almuerzo', 'cena', 'snack']
const today = new Date().toISOString().split('T')[0]

export default function NutricionPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<any>(null)
  const [ingredients, setIngredients] = useState('')
  const [showIngredientsBox, setShowIngredientsBox] = useState(false)

  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [estimating, setEstimating] = useState(false)

  const [showManualForm, setShowManualForm] = useState(false)
  const [manualMeals, setManualMeals] = useState<{ meal_type: string; description: string; calories: string }[]>([
    { meal_type: 'desayuno', description: '', calories: '' },
  ])

  const loadPlan = async () => {
    setLoading(true)
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
    if (res.ok && data.calories) {
      setEditCalories(String(data.calories))
    }
    setEstimating(false)
  }

  const saveEditMeal = async () => {
    if (!editingMealId) return
    await supabase
      .from('meals')
      .update({ description: editDescription, calories: parseInt(editCalories) || 0 })
      .eq('id', editingMealId)

    setEditingMealId(null)
    await loadPlan()
  }

  const toggleConsumed = async (meal: any) => {
    await supabase
      .from('meals')
      .update({ consumed: !meal.consumed })
      .eq('id', meal.id)

    await loadPlan()
  }

  const addManualMealRow = () => {
    setManualMeals((prev) => [...prev, { meal_type: 'snack', description: '', calories: '' }])
  }

  const removeManualMealRow = (index: number) => {
    setManualMeals((prev) => prev.filter((_, i) => i !== index))
  }

  const updateManualMeal = (index: number, field: string, value: string) => {
    setManualMeals((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

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
      .insert({
        user_id: user.id,
        plan_date: today,
        daily_calories: totalCalories,
        generated_by_ai: false,
      })
      .select()
      .single()

    if (planError) {
      setError(planError.message)
      return
    }

    const mealsToInsert = validMeals.map((m) => ({
      meal_plan_id: newPlan.id,
      meal_type: m.meal_type,
      description: m.description,
      calories: parseInt(m.calories) || 0,
    }))

    await supabase.from('meals').insert(mealsToInsert)

    setShowManualForm(false)
    setManualMeals([{ meal_type: 'desayuno', description: '', calories: '' }])
    await loadPlan()
  }

  const consumedCalories =
    plan?.meals?.filter((m: any) => m.consumed).reduce((sum: number, m: any) => sum + m.calories, 0) || 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Nutrición de hoy</h1>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 my-5">
        <button
          onClick={() => setShowIngredientsBox((v) => !v)}
          disabled={generating}
          className="flex items-center justify-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex-1"
        >
          <Sparkles size={16} />
          {plan?.meals?.length ? 'Regenerar con IA' : 'Generar plan con IA'}
        </button>
        <button
          onClick={() => setShowManualForm((v) => !v)}
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition flex-1"
        >
          <Plus size={16} />
          Crear mi propio plan
        </button>
      </div>

      {showIngredientsBox && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ¿Qué alimentos tienes disponibles hoy? (opcional)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Ej: pollo, arroz, huevos, avena, plátano, atún, lentejas...
          </p>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="Escribe los alimentos que tienes, separados por comas"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-3 w-full bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando plan personalizado...
              </>
            ) : (
              'Generar mi plan de hoy'
            )}
          </button>
        </div>
      )}

      {showManualForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Arma tu plan de hoy</p>
          <div className="space-y-3">
            {manualMeals.map((m, index) => (
              <div key={index} className="flex flex-wrap gap-2 items-center bg-gray-50 p-2 rounded-lg">
                <select
                  value={m.meal_type}
                  onChange={(e) => updateManualMeal(index, 'meal_type', e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                  {mealOrder.map((t) => (
                    <option key={t} value={t}>{mealLabels[t]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={m.description}
                  onChange={(e) => updateManualMeal(index, 'description', e.target.value)}
                  placeholder="Descripción de la comida"
                  className="flex-1 min-w-[140px] px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={m.calories}
                  onChange={(e) => updateManualMeal(index, 'calories', e.target.value)}
                  placeholder="Kcal"
                  className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                />
                {manualMeals.length > 1 && (
                  <button onClick={() => removeManualMealRow(index)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addManualMealRow}
            className="flex items-center gap-1.5 text-green-600 text-sm font-medium mt-3 hover:underline"
          >
            <Plus size={14} /> Agregar otra comida
          </button>
          <button
            onClick={saveManualPlan}
            className="w-full mt-4 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-700 transition"
          >
            Guardar mi plan de hoy
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : !plan ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-gray-500">Aún no tienes un plan para hoy.</p>
          <p className="text-sm text-gray-400 mt-1">Genera uno con IA o créalo tú mismo 👆</p>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Consumido / Meta</p>
                <p className="text-3xl font-bold text-gray-900">
                  {consumedCalories} <span className="text-base font-medium text-gray-400">/ {plan.daily_calories} kcal</span>
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (consumedCalories / (plan.daily_calories || 1)) * 100)}%`,
                }}
              />
            </div>

            {(plan.protein_g || plan.carbs_g || plan.fats_g) && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Proteína</p>
                  <p className="text-lg font-bold text-red-700">{plan.protein_g || 0}g</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium">Carbohidratos</p>
                  <p className="text-lg font-bold text-amber-700">{plan.carbs_g || 0}g</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Grasas</p>
                  <p className="text-lg font-bold text-blue-700">{plan.fats_g || 0}g</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {mealOrder.map((type) => {
              const meal = plan.meals?.find((m: any) => m.meal_type === type)
              if (!meal) return null
              const Icon = mealIcons[type]
              const isEditing = editingMealId === meal.id

              return (
                <div
                  key={meal.id}
                  className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition ${
                    meal.consumed ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => toggleConsumed(meal)}
                    className="flex-shrink-0 mt-0.5"
                    title={meal.consumed ? 'Marcar como no comido' : 'Marcar como comido'}
                  >
                    {meal.consumed ? (
                      <CheckCircle2 className="text-green-600" size={22} />
                    ) : (
                      <Circle className="text-gray-300" size={22} />
                    )}
                  </button>

                  <div className="bg-green-50 text-green-600 rounded-lg p-2 flex-shrink-0">
                    <Icon size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold text-sm ${meal.consumed ? 'text-gray-500' : 'text-gray-800'}`}>
                        {mealLabels[type]}
                      </p>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editCalories}
                            onChange={(e) => setEditCalories(e.target.value)}
                            className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-xs text-right"
                          />
                          <button
                            onClick={handleEstimateCalories}
                            disabled={estimating}
                            title="Estimar calorías automáticamente"
                            className="text-gray-400 hover:text-green-600 disabled:opacity-50"
                          >
                            {estimating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Calculator size={14} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">{meal.calories} kcal</p>
                      )}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    ) : (
                      <p className={`text-sm mt-1 ${meal.consumed ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                        {meal.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => (isEditing ? saveEditMeal() : startEditMeal(meal))}
                    className="text-gray-400 hover:text-green-600 flex-shrink-0"
                  >
                    {isEditing ? <Check size={18} /> : <Pencil size={16} />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}