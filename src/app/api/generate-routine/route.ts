import { createClient } from '@/core/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { aiErrorResponse, generateWithFallback, parseJson } from '@/core/ai/gemini'
import { NextResponse } from 'next/server'

// Si un modelo está saturado se prueba otro: la petición puede tardar más que una sola llamada
export const maxDuration = 120

type AiRoutine = {
  title: string
  days: {
    day_number: number
    title: string
    exercises: { exercise_id: string; sets: number; reps: string; rest_seconds: number }[]
  }[]
}

export async function POST(request: Request) {
  let supabase = await createClient()
  let { data: { user } } = await supabase.auth.getUser()

  // Si no hay sesión por cookies (caso móvil), autentica con el token Bearer
  if (!user) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token) {
      // Crea un cliente nuevo, autenticado con ESTE token específico,
      // para que auth.uid() funcione correctamente en las políticas de RLS
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      ) as any

      const { data } = await supabase.auth.getUser(token)
      user = data.user
    }
  }

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // 1. Traer el perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // 2. Traer el catálogo de ejercicios disponibles (filtrado por lugar de entrenamiento)
  const equipmentFilter =
    profile.training_place === 'gym'
      ? ['ninguno', 'mancuernas', 'barra', 'maquina']
      : ['ninguno', 'mancuernas']

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, difficulty')
    .in('equipment', equipmentFilter)

  if (!exercises || exercises.length === 0) {
    return NextResponse.json({ error: 'No hay ejercicios disponibles' }, { status: 400 })
  }

  // 3. Construir el prompt para la IA
  const prompt = `
Eres un entrenador personal experto. Genera una rutina de entrenamiento de 3 días
para esta persona, usando ÚNICAMENTE los ejercicios de la lista proporcionada
(debes usar el "id" exacto de cada ejercicio).

DATOS DEL USUARIO:
- Edad: ${profile.age}
- Género: ${profile.gender}
- Peso: ${profile.weight_kg} kg
- Altura: ${profile.height_cm} cm
- Objetivo: ${profile.goal}
- Nivel de actividad: ${profile.activity_level}
- Tipo de cuerpo (somatotipo): ${profile.body_type}
- Lugar de entrenamiento: ${profile.training_place}
${profile.custom_goal_notes ? `- Meta personal en sus propias palabras: "${profile.custom_goal_notes}" (dale prioridad a esto al diseñar la rutina)` : ''}

LISTA DE EJERCICIOS DISPONIBLES (usa el campo "id"):
${JSON.stringify(exercises)}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto
adicional) con esta estructura exacta:
{
  "title": "Nombre de la rutina",
  "days": [
    {
      "day_number": 1,
      "title": "Nombre del día (ej: Empuje - Pecho y Tríceps)",
      "exercises": [
        { "exercise_id": "uuid-del-ejercicio", "sets": 4, "reps": "8-12", "rest_seconds": 60 }
      ]
    }
  ]
}
Incluye entre 5 y 7 ejercicios por día. Ajusta series, repeticiones y descanso
según el objetivo de la persona.
`.trim()

  const validIds = new Set(exercises.map((e) => e.id))
  let routineId: string | null = null

  try {
    // Se aceptan solo ejercicios del catálogo: un id inventado rompería la llave foránea al guardar
    const { data: aiRoutine, model, attempts } = await generateWithFallback(
      prompt,
      (text) => {
        const parsed = parseJson<AiRoutine>(text)
        const days = (parsed.days || [])
          .map((day) => ({ ...day, exercises: (day.exercises || []).filter((ex) => validIds.has(ex.exercise_id)) }))
          .filter((day) => day.exercises.length > 0)
        if (!parsed.title || days.length === 0) throw new Error('Rutina sin días válidos')
        return { ...parsed, days }
      },
      { json: true }
    )

    // 4. Guardar la rutina en la base de datos
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        title: aiRoutine.title,
        goal: profile.goal,
        generated_by_ai: true,
        ai_prompt_snapshot: profile,
      })
      .select()
      .single()

    if (routineError) throw routineError
    routineId = routine.id

    // 5. Guardar cada día y sus ejercicios
    for (const day of aiRoutine.days) {
      const { data: routineDay, error: dayError } = await supabase
        .from('routine_days')
        .insert({
          routine_id: routine.id,
          day_number: day.day_number,
          title: day.title,
        })
        .select()
        .single()

      if (dayError) throw dayError

      const exercisesToInsert = day.exercises.map((ex: any, index: number) => ({
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

      if (exError) throw exError
    }

    return NextResponse.json({ success: true, routineId: routine.id, model, attempts })
  } catch (err: any) {
    console.error('Error generando rutina:', err)
    // Una rutina a medio guardar no sirve: el borrado arrastra sus días por cascada
    if (routineId) await supabase.from('routines').delete().eq('id', routineId)
    return aiErrorResponse(err, 'No se pudo generar la rutina. Intenta de nuevo.')
  }
}
