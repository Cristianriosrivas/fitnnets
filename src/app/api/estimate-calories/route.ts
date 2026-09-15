import { getGeminiModel } from '@/core/ai/gemini'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { description } = await request.json()

  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'Descripción vacía' }, { status: 400 })
  }

  const prompt = `
Eres un nutricionista experto. Estima las calorías aproximadas de esta comida:
"${description}"

Responde ÚNICAMENTE con un número entero (las calorías totales aproximadas),
sin texto adicional, sin unidades, sin explicación. Solo el número.
Ejemplo de respuesta válida: 450
`.trim()

  try {
    const model = getGeminiModel()
    const result = await model.generateContent(prompt)
    const rawText = result.response.text().trim()

    // Extraer solo el número, por si la IA agrega algo de texto
    const match = rawText.match(/\d+/)
    const calories = match ? parseInt(match[0]) : null

    if (!calories) {
      return NextResponse.json({ error: 'No se pudo estimar' }, { status: 500 })
    }

    return NextResponse.json({ calories })
  } catch (err) {
    console.error('Error estimando calorías:', err)
    return NextResponse.json({ error: 'No se pudo estimar' }, { status: 500 })
  }
}