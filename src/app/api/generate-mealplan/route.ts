import { createClient } from '@/core/supabase/server'
import { getGeminiModel } from '@/core/ai/gemini'
import { NextResponse } from 'next/server'

function calcularCalorias(profile: any) {
  const { weight_kg, height_cm, age, gender, activity_level, goal } = profile

  let bmr =
    gender === 'masculino'
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
      : 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

  const activityMultipliers: Record<string, number> = {
    sedentario: 1.2,
    ligero: 1.375,
    moderado: 1.55,
    intenso: 1.725,
  }

  let tdee = bmr * (activityMultipliers[activity_level] || 1.375)

  if (goal === 'perder_grasa') tdee -= 400
  if (goal === 'ganar_musculo') tdee += 300

  return Math.round(tdee)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const ingredients: string = body.ingredients || ''

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.weight_kg || !profile.height_cm || !profile.age) {
    return NextResponse.json(
      { error: 'Completa tu perfil (peso, altura, edad) antes de generar un plan' },
      { status: 400 }
    )
  }

  const dailyCalories = calcularCalorias(profile)
  const today = new Date().toISOString().split('T')[0]

  const ingredientsInstruction = ingredients.trim()
    ? `La persona indicó que HOY tiene disponibles estos alimentos en casa: "${ingredients}".
       Usa PRIORITARIAMENTE esos alimentos para armar las comidas. Si algo esencial
       falta (ej: una fuente de proteína), puedes sugerir 1-2 alimentos adicionales
       económicos y fáciles de conseguir.`
    : `La persona no especificó qué alimentos tiene, así que usa alimentos comunes
       y accesibles en Latinoamérica.`

  const prompt = `
Eres un nutricionista experto. Genera un plan de alimentación para HOY para esta persona.

DATOS:
- Objetivo: ${profile.goal}
- Calorías diarias objetivo: ${dailyCalories} kcal
- Peso: ${profile.weight_kg} kg
- Tipo de cuerpo: ${profile.body_type}
${profile.custom_goal_notes ? `- Meta personal en sus propias palabras: "${profile.custom_goal_notes}" (ajusta el plan alimenticio priorizando esto)` : ''}

${ingredientsInstruction}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks), con esta
estructura exacta:
{
  "protein_g": numero,
  "carbs_g": numero,
  "fats_g": numero,
  "meals": [
    { "meal_type": "desayuno", "description": "descripción breve y realista", "calories": numero },
    { "meal_type": "almuerzo", "description": "...", "calories": numero },
    { "meal_type": "cena", "description": "...", "calories": numero },
    { "meal_type": "snack", "description": "...", "calories": numero }
  ]
}
Las calorías de todas las comidas deben sumar aproximadamente ${dailyCalories} kcal.
`.trim()

  try {
    const model = getGeminiModel()
    const result = await model.generateContent(prompt)
    const rawText = result.response.text()
    const cleanJson = rawText.replace(/```json|```/g, '').trim()
    const aiPlan = JSON.parse(cleanJson)

    // Borrar el plan de HOY si ya existía (para regenerar limpio)
    const { data: existing } = await supabase
      .from('meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_date', today)

    if (existing && existing.length > 0) {
      const ids = existing.map((p) => p.id)
      await supabase.from('meals').delete().in('meal_plan_id', ids)
      await supabase.from('meal_plans').delete().in('id', ids)
    }

    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        plan_date: today,
        daily_calories: dailyCalories,
        protein_g: aiPlan.protein_g,
        carbs_g: aiPlan.carbs_g,
        fats_g: aiPlan.fats_g,
        generated_by_ai: true,
        available_ingredients: ingredients || null,
      })
      .select()
      .single()

    if (planError) throw planError

    const mealsToInsert = aiPlan.meals.map((m: any) => ({
      meal_plan_id: mealPlan.id,
      meal_type: m.meal_type,
      description: m.description,
      calories: m.calories,
    }))

    const { error: mealsError } = await supabase.from('meals').insert(mealsToInsert)
    if (mealsError) throw mealsError

    return NextResponse.json({ success: true, mealPlanId: mealPlan.id })
  } catch (err: any) {
    console.error('Error generando plan de comidas:', err)
    return NextResponse.json(
      { error: 'No se pudo generar el plan. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}